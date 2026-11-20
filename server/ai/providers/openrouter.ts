import { ENV } from "../../_core/env";
import { AIProviderError, isRetryableStatus } from "../errors";
import {
  normalizeMessageForProvider,
  normalizeResponseFormatForProvider,
  normalizeToolChoiceForProvider,
} from "../normalize";
import type { AIProvider, AIRequest } from "../types";
import type { InvokeResult } from "../../_core/llm";

function text(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((x: any) => x?.type === "text")
      .map((x: any) => x.text ?? "")
      .join("\n");
  }
  return String(content ?? "");
}

function cleanJson(value: string): string {
  if (!value) return "";
  let cleaned = value.trim();

  // 1. Remove blocos de raciocínio de modelos reasoning (<think>...</think>)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Se houver bloco de código markdown, extrai o conteúdo de dentro dele
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Se ainda houver texto conversacional ao redor, localiza o JSON do primeiro '{' ou '[' até o último '}' ou ']'
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

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned.trim();
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Esgota TODAS as IAs gratuitas antes de devolver o erro ao AI Router.
// Modelos rápidos primeiro; openrouter/free (Free Models Router) por último.
export const FREE_MODEL_CHAIN = [
  "nvidia/nemotron-3.5-lightning:free",
  "inclusionai/ling-3.2-flash:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "baidu/ernie-5.5-flash-preview:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "particle-ai/particle-1:free",
  "recursive/flint-v1.0:free",
  "dots-studio/dots-3-note-preview:free",
  // Exige reasoning obrigatório; fica num lote sem Nemotron para não receber effort:none.
  "liquid/lfm-3-1.7b:free",
  "openrouter/free",
];

// A API do OpenRouter aceita no máximo 3 modelos por requisição.
const MODELS_PER_BATCH = 3;

// Limite por lote; com 5 lotes o pior caso fica abaixo do timeout do tRPC.
const REQUEST_TIMEOUT_MS = 35000;

// Nemotron gasta todo o max_tokens raciocinando e devolve conteúdo vazio.
// Desligar o reasoning reduz a latência de ~5s para ~0,4s e garante texto.
const REASONING_MODEL_PATTERN = /nemotron/i;

// A cota gratuita é GLOBAL por conta (50 requisições/dia sem créditos). Quando
// ela acaba, TODOS os modelos ":free" devolvem o mesmo 429 — insiste-los nos
// lotes seguintes só gasta requisições e atrasa o fallback para outros provedores.
const FREE_DAILY_LIMIT_PATTERN = /free-models-per-day|free_daily_limit|openrouter_free_tier_daily/i;

function resetTimeFromHeaders(headers?: Headers): string | null {
  const raw = headers?.get?.("X-RateLimit-Reset");
  if (!raw) return null;
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) return null;
  try {
    return new Date(timestamp).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return new Date(timestamp).toISOString();
  }
}

export const openRouterProvider: AIProvider = {
  id: "openrouter",
  name: "OpenRouter",
  capabilities: {
    chat: true,
    tools: true,
    jsonObject: true,
    jsonSchema: true,
    vision: true,
  },

  isConfigured: () => Boolean(ENV.openRouterApiKey && ENV.openRouterApiKey.trim().length > 0),

  invoke: async (params: AIRequest): Promise<InvokeResult> => {
    const apiKey = ENV.openRouterApiKey?.trim();
    if (!apiKey) {
      throw new AIProviderError({
        provider: "openrouter",
        message: "OPENROUTER_API_KEY não configurada",
        retryable: false,
      });
    }

    const messages = params.messages.map(normalizeMessageForProvider);

    const schema =
      (params.outputSchema as any)?.schema ??
      (params.output_schema as any)?.schema ??
      params.outputSchema ??
      params.output_schema ??
      (params.responseFormat as any)?.json_schema?.schema ??
      (params.response_format as any)?.json_schema?.schema;

    const isJsonRequested = Boolean(
      schema ||
      params.responseFormat?.type === "json_object" ||
      params.response_format?.type === "json_object"
    );

    // Para modelos gratuitos que nem sempre suportam structured output nativo,
    // reforçamos a instrução de saída JSON estrita na mensagem do usuário
    if (schema) {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      if (lastUser) {
        const textContent = text(lastUser.content);
        lastUser.content = `${textContent}

RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO.
NÃO use Markdown.
NÃO use blocos de código.
NÃO escreva texto fora do JSON.

ESTRUTURA ESPERADA:
${JSON.stringify(schema)}`;
      }
    }

    const userModel = ENV.openRouterModel?.trim() || FREE_MODEL_CHAIN[0];
    const modelsList = [userModel, ...FREE_MODEL_CHAIN].filter((v, i, a) => a.indexOf(v) === i);

    // A API limita `models` a 3 itens, então a cadeia é dividida em lotes.
    // Todos os lotes são tentados antes de devolver o erro ao AI Router.
    const batches: string[][] = [];
    for (let i = 0; i < modelsList.length; i += MODELS_PER_BATCH) {
      batches.push(modelsList.slice(i, i + MODELS_PER_BATCH));
    }

    console.log(
      `[AI/OpenRouter] model=${userModel} totalModels=${modelsList.length} lotes=${batches.length}`,
    );

    const payloadBase: Record<string, unknown> = { messages, stream: false };

    if (params.maxTokens ?? params.max_tokens) {
      payloadBase.max_tokens = params.maxTokens ?? params.max_tokens;
    }

    if (params.tools?.length) {
      payloadBase.tools = params.tools;
    }

    const toolChoice = normalizeToolChoiceForProvider(
      params.toolChoice || params.tool_choice,
      params.tools,
    );
    if (toolChoice) {
      payloadBase.tool_choice = toolChoice;
    }

    const responseFormat = normalizeResponseFormatForProvider({
      responseFormat: params.responseFormat,
      response_format: params.response_format,
      outputSchema: params.outputSchema,
      output_schema: params.output_schema,
    });
    if (responseFormat) {
      payloadBase.response_format = responseFormat;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://simulador-tribunal.local",
      "X-Title": "Simulador de Tribunal",
    };

    let lastError: AIProviderError | null = null;
    let dailyLimitError: AIProviderError | null = null;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const payload: Record<string, unknown> = {
        ...payloadBase,
        model: batch[0],
        models: batch,
      };

      // Nemotron consome todo o max_tokens raciocinando e devolve conteúdo vazio.
      // effort:none reduz de ~5s para ~0,4s e garante texto na resposta.
      if (batch.some(model => REASONING_MODEL_PATTERN.test(model))) {
        payload.reasoning = { effort: "none" };
      }

      console.log(
        `[AI/OpenRouter] lote ${batchIndex + 1}/${batches.length}: ${batch.join(", ")}`,
      );

      try {
        let response = await fetch(OPENROUTER_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        // Alguns modelos gratuitos rejeitam parâmetros avançados (response_format
        // ou reasoning). Remove apenas o que foi rejeitado e retenta no mesmo lote.
        if (!response.ok && response.status === 400) {
          const errorPeek = await response.text();
          let retried = false;

          if (
            payload.response_format &&
            /response_format|json_schema|schema/i.test(errorPeek)
          ) {
            console.warn(
              "[AI/OpenRouter] Modelo não suporta response_format. Retentando com fallback no prompt...",
            );
            delete payload.response_format;
            retried = true;
          }

          if (payload.reasoning && /reasoning/i.test(errorPeek)) {
            console.warn(
              "[AI/OpenRouter] Modelo exige reasoning. Retentando sem effort:none...",
            );
            delete payload.reasoning;
            retried = true;
          }

          if (retried) {
            response = await fetch(OPENROUTER_ENDPOINT, {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
          } else {
            throw new AIProviderError({
              provider: "openrouter",
              status: response.status,
              retryable: isRetryableStatus(response.status),
              message: `OpenRouter API error ${response.status}: ${errorPeek}`,
            });
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `[AI/OpenRouter] Erro ${response.status} no lote ${batchIndex + 1}: ${errorBody.slice(0, 200)}`,
          );

          // Limite diário da conta: nenhum dos modelos restantes pode responder.
          // Parar aqui preserva requisições e avisa o AI Router para usar o último recurso.
          if (response.status === 429 && FREE_DAILY_LIMIT_PATTERN.test(errorBody)) {
            const reset = resetTimeFromHeaders(response.headers);
            const message = [
              "Cota diária de modelos gratuitos do OpenRouter esgotada (50 requisições/dia sem créditos).",
              `Os ${modelsList.length} modelos compartilham a mesma cota; tentar os demais lotes não ajuda.`,
              reset
                ? `Reseta em ${reset} (horário de Brasília).`
                : "Consulte X-RateLimit-Reset no cabeçalho da resposta.",
              "Adicione US$ 10 em créditos para elevar o limite a 1000 requisições/dia.",
            ].join(" ");
            console.warn(`[AI/OpenRouter] ${message}`);
            dailyLimitError = new AIProviderError({
              provider: "openrouter",
              status: 429,
              retryable: false,
              message,
            });
            break;
          }

          lastError = new AIProviderError({
            provider: "openrouter",
            status: response.status,
            retryable: isRetryableStatus(response.status) || response.status === 429,
            message: `OpenRouter API error ${response.status}: ${errorBody}`,
          });
          continue;
        }

        const data: any = await response.json();
        const choices = Array.isArray(data.choices) ? data.choices : [];

        const formattedChoices = choices.map((c: any, index: number) => {
          let content = text(c.message?.content);
          if (isJsonRequested) {
            content = cleanJson(content);
          }

          return {
            index: c.index ?? index,
            message: {
              role: c.message?.role ?? "assistant",
              content,
              ...(c.message?.tool_calls?.length ? { tool_calls: c.message.tool_calls } : {}),
            },
            finish_reason: c.finish_reason ?? "stop",
          };
        });

        return {
          id: data.id ?? `openrouter-${Date.now()}`,
          created: data.created ?? Math.floor(Date.now() / 1000),
          model: data.model ?? batch[0],
          choices: formattedChoices,
          usage: data.usage ?? {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };
      } catch (error) {
        // Mesmo erros 4xx de um modelo específico não encerram a cadeia:
        // outro lote/modelo gratuito pode responder.
        if (error instanceof AIProviderError) {
          lastError = error;
          continue;
        }
        lastError = new AIProviderError({
          provider: "openrouter",
          retryable: true,
          message: `Falha na requisição ao OpenRouter: ${error instanceof Error ? error.message : String(error)}`,
          cause: error,
        });
        continue;
      }
    }

    if (dailyLimitError) throw dailyLimitError;

    throw lastError ?? new AIProviderError({
      provider: "openrouter",
      retryable: true,
      message: "Todos os modelos gratuitos do OpenRouter falharam",
    });
  },
};
