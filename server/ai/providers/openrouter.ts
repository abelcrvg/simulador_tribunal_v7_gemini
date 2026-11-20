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

    const defaultModel = "nvidia/nemotron-3.5-lightning:free";
    const userModel = ENV.openRouterModel?.trim() || defaultModel;
    
    // Lista de fallback de até 3 modelos rápidos e estáveis para o OpenRouter
    const modelsList = [
      userModel,
      "nvidia/nemotron-3.5-lightning:free",
      "inclusionai/ling-3.2-flash:free",
      "openrouter/free",
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

    const payload: Record<string, unknown> = {
      model: userModel,
      models: modelsList,
      messages,
      stream: false,
    };

    if (params.maxTokens ?? params.max_tokens) {
      payload.max_tokens = params.maxTokens ?? params.max_tokens;
    }

    if (params.tools?.length) {
      payload.tools = params.tools;
    }

    const toolChoice = normalizeToolChoiceForProvider(
      params.toolChoice || params.tool_choice,
      params.tools,
    );
    if (toolChoice) {
      payload.tool_choice = toolChoice;
    }

    const responseFormat = normalizeResponseFormatForProvider({
      responseFormat: params.responseFormat,
      response_format: params.response_format,
      outputSchema: params.outputSchema,
      output_schema: params.output_schema,
    });
    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://simulador-tribunal.local",
      "X-Title": "Simulador de Tribunal",
    };

    let response: Response;

    try {
      response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000),
      });

      // Se o modelo gratuito rejeitar response_format (ex.: json_schema não suportado),
      // retenta sem response_format, pois a instrução já está no prompt
      if (!response.ok && payload.response_format && response.status === 400) {
        const errorPeek = await response.text();
        if (
          errorPeek.includes("response_format") ||
          errorPeek.includes("json_schema") ||
          errorPeek.includes("schema")
        ) {
          console.warn("[AI/OpenRouter] Modelo gratuito não suporta response_format. Retentando com fallback no prompt...");
          delete payload.response_format;
          response = await fetch(OPENROUTER_ENDPOINT, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(35000),
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
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError({
        provider: "openrouter",
        retryable: true,
        message: `Falha na requisição ao OpenRouter: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError({
        provider: "openrouter",
        status: response.status,
        retryable: isRetryableStatus(response.status) || response.status === 429,
        message: `OpenRouter API error ${response.status}: ${errorBody}`,
      });
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
      model: data.model ?? userModel,
      choices: formattedChoices,
      usage: data.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  },
};
