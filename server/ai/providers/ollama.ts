import { ENV } from "../../_core/env";
import { AIProviderError } from "../errors";

function text(content: any): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .filter((x) => x?.type === "text")
      .map((x) => x.text ?? "")
      .join("\n");
  }

  return String(content ?? "");
}

function cleanJson(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export const ollamaProvider: any = {
  id: "ollama",
  name: "Ollama Cloud / Gemma 4",

  capabilities: {
    chat: true,
    tools: true,
    jsonObject: true,
    jsonSchema: false,
    vision: true,
  },

  isConfigured() {
    return Boolean(
      ENV.ollamaApiKey &&
      ENV.ollamaBaseUrl &&
      ENV.ollamaModel
    );
  },

  async invoke(params: any) {
    if (!ENV.ollamaApiKey) {
      throw new AIProviderError({
        provider: "ollama",
        message: "OLLAMA_API_KEY não configurada",
        retryable: false,
      });
    }

    const messages = (params.messages ?? []).map((m: any) => ({
      role:
        m.role === "assistant"
          ? "assistant"
          : m.role === "system"
            ? "system"
            : m.role === "tool"
              ? "tool"
              : "user",
      content: text(m.content),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    }));

    const schema =
      params.outputSchema ??
      params.output_schema ??
      params.responseFormat?.json_schema?.schema ??
      params.response_format?.json_schema?.schema;

    if (schema) {
      const lastUser = [...messages]
        .reverse()
        .find((m: any) => m.role === "user");

      if (lastUser) {
        lastUser.content += `

RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO.
NÃO use Markdown.
NÃO use blocos de código.
NÃO escreva texto fora do JSON.

ESTRUTURA ESPERADA:
${JSON.stringify(schema)}
`;
      }
    }

    const payload: any = {
      model: ENV.ollamaModel,
      messages,
      stream: false,
    };

    if (params.tools?.length) {
      payload.tools = params.tools;
    }

    const baseUrl = ENV.ollamaBaseUrl
      .replace(/\/+$/, "");

    let response: Response;

    try {
      response = await fetch(
        `${baseUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${ENV.ollamaApiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      throw new AIProviderError({
        provider: "ollama",
        message:
          `Falha de conexão com Ollama Cloud: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        retryable: true,
      });
    }

    if (!response.ok) {
      const body = await response.text();

      throw new AIProviderError({
        provider: "ollama",
        status: response.status,
        message:
          `Ollama Cloud ${response.status}: ${body}`,
        retryable:
          response.status === 429 ||
          response.status >= 500,
      });
    }

    const data: any = await response.json();
    const answer = data.message ?? {};

    let content = text(answer.content);

    if (schema) {
      content = cleanJson(content);
    }

    const toolCalls = Array.isArray(answer.tool_calls)
      ? answer.tool_calls.map(
          (call: any, index: number) => ({
            id:
              `ollama-${Date.now()}-${index}`,
            type: "function",
            function: {
              name:
                call.function?.name ?? "",
              arguments:
                typeof call.function?.arguments ===
                "string"
                  ? call.function.arguments
                  : JSON.stringify(
                      call.function?.arguments ?? {}
                    ),
            },
          })
        )
      : [];

    return {
      id: `ollama-${Date.now()}`,
      created:
        Math.floor(Date.now() / 1000),
      model:
        data.model ?? ENV.ollamaModel,

      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
            ...(toolCalls.length
              ? { tool_calls: toolCalls }
              : {}),
          },
          finish_reason:
            data.done_reason ?? "stop",
        },
      ],

      usage: {
        prompt_tokens:
          data.prompt_eval_count ?? 0,
        completion_tokens:
          data.eval_count ?? 0,
        total_tokens:
          (data.prompt_eval_count ?? 0) +
          (data.eval_count ?? 0),
      },
    };
  },
};
