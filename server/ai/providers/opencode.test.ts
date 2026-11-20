import { beforeEach, describe, expect, it, vi } from "vitest";

const BASE_URL = "http://opencode.test";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function modelResponse() {
  return json({
    data: [
      {
        id: "google/gemma-4-31b-it",
        providerID: "nvidia",
        modelID: "google/gemma-4-31b-it",
        name: "Gemma 4 31B",
        type: "chat",
        enabled: true,
        cost: [{ input: 0, output: 0 }],
      },
      {
        id: "poolside/laguna-xs-2.1",
        providerID: "nvidia",
        modelID: "poolside/laguna-xs-2.1",
        name: "Laguna XS 2.1",
        type: "chat",
        enabled: true,
        cost: [{ input: 0, output: 0 }],
      },
      {
        id: "paid-model",
        providerID: "openai",
        modelID: "paid-model",
        name: "Paid",
        type: "chat",
        enabled: true,
        cost: [{ input: 1, output: 2 }],
      },
    ],
  });
}

type FetchCall = { url: string; init?: RequestInit };

async function loadProvider(fetchImpl: (call: FetchCall) => Promise<Response>) {
  vi.resetModules();
  vi.stubEnv("OPENCODE_BASE_URL", BASE_URL);
  vi.stubEnv("OPENCODE_SERVER_PASSWORD", "senha-de-teste");
  vi.stubEnv("OPENCODE_ENABLED", "true");
  vi.stubEnv("OPENCODE_AGENT", "tribunal-speaker");
  vi.stubEnv("OPENCODE_MODEL", "");
  vi.stubEnv("OPENCODE_PROJECT_DIR", "C:/projeto");

  const calls: FetchCall[] = [];
  const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    return fetchImpl(call);
  });
  vi.stubGlobal("fetch", mockFetch);

  const module = await import("./opencode");
  return { provider: module.openCodeProvider, calls, mockFetch };
}

function defaultFetch(text = "Fala do personagem", options: { failFirstSession?: boolean } = {}) {
  let sessionCreates = 0;
  return async ({ url, init }: FetchCall): Promise<Response> => {
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/info")) return json({ version: "2.3.2", pid: 1 });
    if (url.endsWith("/api/model")) return modelResponse();

    if (url.endsWith("/api/session") && method === "POST") {
      sessionCreates += 1;
      if (options.failFirstSession && sessionCreates === 1) {
        return json({ _tag: "UnknownError", message: "temporarily unavailable" }, 503);
      }
      return json({ data: { id: "ses_teste" } });
    }

    if (url.includes("/api/session/ses_teste/prompt")) return json({ data: {} });
    if (url.includes("/api/experimental/session/ses_teste/wait")) return new Response(null, { status: 204 });
    if (url.includes("/api/session/ses_teste/message")) {
      return json({
        data: [
          { type: "user", content: [{ type: "text", text: "prompt" }] },
          { type: "assistant", content: [{ type: "text", text }] },
        ],
      });
    }
    if (url.endsWith("/api/session/ses_teste") && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Rota não mockada: ${method} ${url}`);
  };
}

describe("OpenCode provider", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("detecta o serviço local pelo /api/info", async () => {
    const { provider } = await loadProvider(defaultFetch());
    await expect(provider.isConfigured({ messages: [] })).resolves.toBe(true);
  });

  it("marca como não configurado quando o serviço está indisponível", async () => {
    const { provider } = await loadProvider(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(provider.isConfigured({ messages: [] })).resolves.toBe(false);
  });

  it("gera a fala usando o agente dedicado e o modelo gratuito", async () => {
    const { provider, calls } = await loadProvider(defaultFetch("Excelência, votos pela procedência."));

    const result = await provider.invoke({
      messages: [
        { role: "system", content: "Você é um ministro do STF." },
        { role: "user", content: "Profira seu voto." },
      ],
    });

    expect(result.model).toBe("nvidia/google/gemma-4-31b-it");
    expect(result.choices[0].message.content).toBe("Excelência, votos pela procedência.");

    const createCall = calls.find(c => c.url.endsWith("/api/session") && c.init?.method === "POST");
    expect(createCall).toBeDefined();
    const body = JSON.parse(String(createCall?.init?.body));
    expect(body.agent).toBe("tribunal-speaker");
    expect(body.model).toEqual({ providerID: "nvidia", id: "google/gemma-4-31b-it" });
    expect(body.location).toEqual({ directory: "C:/projeto" });

    const auth = (createCall?.init?.headers as Record<string, string>)?.Authorization;
    expect(auth?.startsWith("Basic ")).toBe(true);

    const promptCall = calls.find(c => c.url.includes("/prompt"));
    const promptBody = JSON.parse(String(promptCall?.init?.body));
    expect(promptBody.text).toContain("[SYSTEM]");
    expect(promptBody.text).toContain("[USER]");
    expect(promptBody.resume).toBe(true);
  });

  it("gira para o próximo modelo quando o primeiro falha", async () => {
    const { provider, calls } = await loadProvider(defaultFetch("Resposta do segundo modelo", { failFirstSession: true }));

    const result = await provider.invoke({ messages: [{ role: "user", content: "Olá" }] });

    const createCalls = calls.filter(c => c.url.endsWith("/api/session") && c.init?.method === "POST");
    expect(createCalls).toHaveLength(2);
    const bodies = createCalls.map(c => JSON.parse(String(c.init?.body)));
    expect(bodies[0].model.id).not.toBe(bodies[1].model.id);
    expect(result.choices[0].message.content).toBe("Resposta do segundo modelo");
  });

  it("extrai JSON de blocos Markdown quando a saída estruturada é pedida", async () => {
    const { provider } = await loadProvider(defaultFetch('```json\n{"acao":"fala"}\n```'));

    const result = await provider.invoke({
      messages: [{ role: "user", content: "Decida" }],
      responseFormat: { type: "json_object" },
    });

    expect(JSON.parse(String(result.choices[0].message.content))).toEqual({ acao: "fala" });
  });
});
