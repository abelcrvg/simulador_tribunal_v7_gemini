import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { ENV } from "../../_core/env";
import { AIProviderError, isRetryableStatus } from "../errors";
import type { AIProvider, AIRequest, AIResponse } from "../types";

/**
 * OpenCode como provedor principal.
 *
 * O cliente oficial (`@opencode/client`) usa o mesmo contrato HTTP desta
 * implementação. Evitamos a dependência extra e conversamos diretamente com o
 * servidor local do OpenCode (`opencode serve` / background service).
 *
 * A API HTTP é experimental. Usamos uma sessão descartável por fala, com o
 * agente `tribunal-speaker` (steps: 1, todas as ferramentas negadas), para que
 * o modelo produza apenas o texto do personagem.
 */

type OpenCodeConnection = {
  baseUrl: string;
  authHeader?: string;
};

type OpenCodeModelRef = {
  providerID: string;
  id: string;
  name?: string;
};

type OpenCodeCatalogModel = OpenCodeModelRef & {
  enabled?: boolean;
  type?: string;
  cost?: Array<{ input?: number | string; output?: number | string }>;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:4096";
const CONNECT_TIMEOUT_MS = 4000;
const GENERATION_TIMEOUT_MS = 45000;
const CATALOG_CACHE_MS = 5 * 60 * 1000;
const REACHABILITY_CACHE_MS = 30 * 1000;
const MAX_MODELS_TO_TRY = 6;

// Modelos gratuitos conhecidos por responderem com texto (não apenas
// raciocínio) no catálogo do OpenCode em 2026-11-20. A ordem privilegia os
// provedores com cota própria (Nvidia) antes do pool `opencode`, que também
// pode atingir limite diário.
const PREFERRED_FREE_MODELS: OpenCodeModelRef[] = [
  { providerID: "nvidia", id: "google/gemma-4-31b-it" },
  { providerID: "nvidia", id: "nvidia/nemotron-3.5-lightning-30b-a3b" },
  { providerID: "nvidia", id: "minimaxai/minimax-m3.1-flash" },
  { providerID: "nvidia", id: "poolside/laguna-xs-2.1" },
  { providerID: "opencode", id: "nemotron-3.5-lightning-free" },
  { providerID: "opencode", id: "hy4-flash-free" },
  { providerID: "opencode", id: "deepseek-v4.1-flash-free" },
  { providerID: "opencode", id: "mimo-v2.6-flash-free" },
  { providerID: "opencode", id: "flint-40b-free" },
  { providerID: "opencode", id: "iceman-free" },
  { providerID: "opencode", id: "longcat-2.5-free" },
  { providerID: "opencode", id: "beam-free" },
];

// Modelos de segurança, voz, visão ou raciocínio puro não servem para gerar a
// fala de um personagem e costumam devolver `content` vazio.
const EXCLUDED_MODEL_PATTERN =
  /guard|safety|voice|transcri|embed|vision|\bvl\b|image|video|reasoning|content-safety|diffusion/i;

let catalogCache: { at: number; models: OpenCodeModelRef[] } | null = null;
let reachabilityCache: { at: number; ok: boolean } | null = null;
let modelCursor = 0;

function serviceInfoPath(): string {
  const stateHome = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(stateHome, "opencode", "service.json");
}

async function connection(): Promise<OpenCodeConnection> {
  const envBaseUrl = ENV.opencodeBaseUrl?.trim();
  if (envBaseUrl) {
    const password = ENV.opencodePassword?.trim();
    return {
      baseUrl: envBaseUrl.replace(/\/+$/, ""),
      ...(password
        ? { authHeader: `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` }
        : {}),
    };
  }

  try {
    const raw = await readFile(serviceInfoPath(), "utf8");
    const info = JSON.parse(raw) as { url?: string; password?: string };
    if (info.url) {
      return {
        baseUrl: info.url.replace(/\/+$/, ""),
        ...(info.password
          ? { authHeader: `Basic ${Buffer.from(`opencode:${info.password}`).toString("base64")}` }
          : {}),
      };
    }
  } catch {
    // Sem service.json: cai na URL padrão; isConfigured vai marcar como
    // indisponível e o OpenRouter assume a chamada.
  }

  return { baseUrl: DEFAULT_BASE_URL };
}

function headersFor(conn: OpenCodeConnection, withBody = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withBody) headers["Content-Type"] = "application/json";
  // Nunca registre este cabeçalho: ele contém a senha do serviço local.
  if (conn.authHeader) headers.Authorization = conn.authHeader;
  return headers;
}

async function reachable(): Promise<boolean> {
  const now = Date.now();
  if (reachabilityCache && now - reachabilityCache.at < REACHABILITY_CACHE_MS) {
    return reachabilityCache.ok;
  }

  try {
    const conn = await connection();
    const response = await fetch(`${conn.baseUrl}/api/info`, {
      headers: headersFor(conn),
      signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
    });
    const ok = response.ok;
    reachabilityCache = { at: now, ok };
    return ok;
  } catch {
    reachabilityCache = { at: now, ok: false };
    return false;
  }
}

async function requestJson(
  conn: OpenCodeConnection,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<any> {
  const method = init.method ?? "GET";
  const response = await fetch(`${conn.baseUrl}${path}`, {
    method,
    headers: headersFor(conn, init.body !== undefined),
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(init.timeoutMs ?? GENERATION_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 600);
    throw new AIProviderError({
      provider: "opencode",
      status: response.status,
      retryable: isRetryableStatus(response.status),
      message: `OpenCode API error ${response.status}: ${detail}`,
    });
  }

  if (response.status === 204) return null;
  return response.json();
}

function isFreeModel(model: OpenCodeCatalogModel): boolean {
  if (model.enabled === false) return false;
  if (model.type && model.type !== "chat" && model.type !== "decision") return false;
  if (EXCLUDED_MODEL_PATTERN.test(`${model.id} ${model.name ?? ""}`)) return false;

  const costs = Array.isArray(model.cost) ? model.cost : [];
  if (costs.length === 0) return true;
  return costs.every(cost => Number(cost?.input ?? 0) === 0 && Number(cost?.output ?? 0) === 0);
}

function sameModel(a: OpenCodeModelRef, b: OpenCodeModelRef): boolean {
  return a.providerID === b.providerID && a.id === b.id;
}

async function availableModels(): Promise<OpenCodeModelRef[]> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_CACHE_MS) return catalogCache.models;

  const conn = await connection();
  const data = await requestJson(conn, "/api/model", { timeoutMs: 12000 });
  const catalog: OpenCodeCatalogModel[] = Array.isArray(data?.data) ? data.data : [];
  const free = catalog.filter(isFreeModel);

  const ordered: OpenCodeModelRef[] = [];

  const configured = ENV.opencodeModel?.trim();
  if (configured) {
    const [first, second] = configured.split("/");
    const ref = second
      ? { providerID: first, id: configured.slice(first.length + 1) }
      : { providerID: "opencode", id: first };
    if (free.some(model => sameModel(model, ref))) ordered.push(ref);
  }

  for (const preferred of PREFERRED_FREE_MODELS) {
    if (free.some(model => sameModel(model, preferred)) && !ordered.some(m => sameModel(m, preferred))) {
      ordered.push(preferred);
    }
  }

  for (const model of free) {
    // OpenRouter já é o próximo provedor do roteador; não duplicamos sua cota
    // dentro do OpenCode.
    if (model.providerID === "openrouter") continue;
    const ref = { providerID: model.providerID, id: model.id, name: model.name };
    if (!ordered.some(m => sameModel(m, ref))) ordered.push(ref);
  }

  const models = ordered.slice(0, 12);
  catalogCache = { at: now, models };
  console.log(`[AI/OpenCode] ${free.length} modelos gratuitos no catálogo; ${models.length} na rotação`);
  return models;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  return content
    .map((part: any) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return String(part.text ?? "");
      if (part?.type === "image_url" || part?.type === "file_url") return "[anexo]";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function schemaFrom(params: AIRequest): unknown {
  return (
    (params.outputSchema as any)?.schema ??
    (params.output_schema as any)?.schema ??
    params.outputSchema ??
    params.output_schema ??
    (params.responseFormat as any)?.json_schema?.schema ??
    (params.response_format as any)?.json_schema?.schema
  );
}

function buildPrompt(params: AIRequest): { prompt: string; wantsJson: boolean } {
  const sections = params.messages.map(message => {
    const role = String(message.role ?? "user").toUpperCase();
    return `[${role}]\n${textFromContent(message.content)}`;
  });

  const schema = schemaFrom(params);
  const wantsJson = Boolean(
    schema ||
      params.responseFormat?.type === "json_object" ||
      params.response_format?.type === "json_object",
  );

  if (wantsJson) {
    sections.push(
      [
        "RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO.",
        "Não use Markdown, blocos de código nem texto fora do JSON.",
        ...(schema ? [`ESTRUTURA ESPERADA:\n${JSON.stringify(schema)}`] : []),
      ].join("\n"),
    );
  }

  return { prompt: sections.join("\n\n"), wantsJson };
}

function cleanJson(value: string): string {
  let cleaned = value.trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock?.[1]) cleaned = codeBlock[1].trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = cleaned.lastIndexOf("]");
  }

  return start !== -1 && end > start ? cleaned.slice(start, end + 1).trim() : cleaned;
}

function extractAssistantText(response: any): string {
  const messages: any[] = Array.isArray(response?.data) ? response.data : [];
  const chunks: string[] = [];

  for (const message of messages) {
    if (message?.type !== "assistant") continue;
    const content = message.content;
    if (typeof content === "string") {
      chunks.push(content);
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type === "text" && typeof part.text === "string") chunks.push(part.text);
    }
  }

  return chunks.join("\n").trim();
}

async function generateOnce(
  conn: OpenCodeConnection,
  model: OpenCodeModelRef,
  prompt: string,
): Promise<string> {
  const created = await requestJson(conn, "/api/session", {
    method: "POST",
    body: {
      title: "Tribunal — fala de personagem",
      agent: ENV.opencodeAgent || "tribunal-speaker",
      model: { providerID: model.providerID, id: model.id },
      location: { directory: ENV.opencodeProjectDir || process.cwd() },
    },
  });

  const sessionId = created?.data?.id;
  if (!sessionId || typeof sessionId !== "string") {
    throw new AIProviderError({
      provider: "opencode",
      message: "OpenCode não devolveu o ID da sessão",
      retryable: true,
    });
  }

  try {
    await requestJson(conn, `/api/session/${encodeURIComponent(sessionId)}/prompt`, {
      method: "POST",
      body: { text: prompt, resume: true },
    });

    await requestJson(conn, `/api/experimental/session/${encodeURIComponent(sessionId)}/wait`, {
      method: "POST",
      body: {},
    });

    const messages = await requestJson(
      conn,
      `/api/session/${encodeURIComponent(sessionId)}/message?type=assistant`,
    );
    const text = extractAssistantText(messages);
    if (!text) {
      throw new AIProviderError({
        provider: "opencode",
        message: `OpenCode (${model.providerID}/${model.id}) retornou texto vazio`,
        retryable: true,
      });
    }
    return text;
  } finally {
    try {
      await requestJson(conn, `/api/session/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        timeoutMs: 8000,
      });
    } catch {
      // Sessão descartável: falha ao apagar não invalida a resposta.
    }
  }
}

export const openCodeProvider: AIProvider = {
  id: "opencode",
  name: "OpenCode",
  capabilities: {
    chat: true,
    tools: false,
    jsonObject: true,
    jsonSchema: false,
    vision: false,
  },

  isConfigured: async () => {
    if (ENV.opencodeEnabled === "false") return false;
    return reachable();
  },

  invoke: async (params: AIRequest): Promise<AIResponse> => {
    if (ENV.opencodeEnabled === "false") {
      throw new AIProviderError({
        provider: "opencode",
        message: "OPENCODE_ENABLED=false",
        retryable: false,
      });
    }

    const conn = await connection();
    const models = await availableModels();
    if (!models.length) {
      throw new AIProviderError({
        provider: "opencode",
        message: "Nenhum modelo gratuito disponível no catálogo do OpenCode",
        retryable: true,
      });
    }

    const { prompt, wantsJson } = buildPrompt(params);
    const start = modelCursor++ % models.length;
    let lastError: AIProviderError | null = null;

    for (let offset = 0; offset < Math.min(MAX_MODELS_TO_TRY, models.length); offset++) {
      const model = models[(start + offset) % models.length];
      try {
        console.log(`[AI/OpenCode] tentando ${model.providerID}/${model.id}`);
        const raw = await generateOnce(conn, model, prompt);
        const content = wantsJson ? cleanJson(raw) : raw;
        console.log(`[AI/OpenCode] resposta recebida de ${model.providerID}/${model.id}`);
        return {
          id: `opencode-${Date.now()}`,
          created: Math.floor(Date.now() / 1000),
          model: `${model.providerID}/${model.id}`,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
      } catch (error) {
        lastError =
          error instanceof AIProviderError
            ? error
            : new AIProviderError({
                provider: "opencode",
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
              });
        console.warn(
          `[AI/OpenCode] ${model.providerID}/${model.id} falhou: ${lastError.message.slice(0, 240)}`,
        );
        reachabilityCache = { at: Date.now(), ok: false };
      }
    }

    throw lastError ?? new AIProviderError({
      provider: "opencode",
      message: "Nenhum modelo gratuito do OpenCode respondeu",
      retryable: true,
    });
  },
};
