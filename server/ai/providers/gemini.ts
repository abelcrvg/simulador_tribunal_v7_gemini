import { ENV } from "../../_core/env";
import { AIProviderError } from "../errors";
import type { AIProvider, AIRequest } from "../types";
import type {
  InvokeResult,
  Message,
  MessageContent,
  Tool,
} from "../../_core/llm";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function textFromContent(content: MessageContent | MessageContent[]): string {
  const parts = Array.isArray(content) ? content : [content];
  return parts
    .map(part => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function toGeminiPart(part: MessageContent) {
  if (typeof part === "string") return { text: part };
  if (part.type === "text") return { text: part.text };

  if (part.type === "image_url") {
    const url = part.image_url.url;
    const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) {
      throw new Error("Gemini vision currently requires image_url content as a data URL");
    }
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }

  if (part.type === "file_url") {
    const url = part.file_url.url;
    const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) {
      throw new Error("Gemini file content currently requires file_url content as a data URL");
    }
    return {
      inlineData: {
        mimeType: match[1] || "application/octet-stream",
        data: match[2],
      },
    };
  }

  return { text: String(part) };
}

function convertMessages(messages: Message[]) {
  const systemParts: Array<Record<string, unknown>> = [];
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];

  for (const message of messages) {
    if (message.role === "system") {
      const text = textFromContent(message.content);
      if (text) systemParts.push({ text });
      continue;
    }

    // Gemini calls the assistant role "model".
    if (message.role === "assistant") {
      contents.push({
        role: "model",
        parts: Array.isArray(message.content)
          ? message.content.map(toGeminiPart)
          : [toGeminiPart(message.content)],
      });
      continue;
    }

    // Tool/function messages are represented as functionResponse parts.
    if (message.role === "tool" || message.role === "function") {
      const text = textFromContent(message.content);
      let response: unknown = text;
      try {
        response = JSON.parse(text);
      } catch {
        // Keep plain text when the tool returned non-JSON output.
      }

      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name || "tool",
              response: typeof response === "object" && response !== null ? response : { result: response },
            },
          },
        ],
      });
      continue;
    }

    contents.push({
      role: "user",
      parts: Array.isArray(message.content)
        ? message.content.map(toGeminiPart)
        : [toGeminiPart(message.content)],
    });
  }

  return { systemParts, contents };
}

function convertTools(tools: Tool[] | undefined) {
  if (!tools?.length) return undefined;

  return [
    {
      functionDeclarations: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: sanitizeGeminiSchema(tool.function.parameters),
      })),
    },
  ];
}

function convertToolConfig(toolChoice: AIRequest["toolChoice"] | AIRequest["tool_choice"], tools?: Tool[]) {
  if (!toolChoice) return undefined;

  let mode: "AUTO" | "NONE" | "ANY" = "AUTO";
  let allowedFunctionNames: string[] | undefined;

  if (toolChoice === "none") mode = "NONE";
  else if (toolChoice === "required") mode = "ANY";
  else if (toolChoice === "auto") mode = "AUTO";
  else if ("name" in toolChoice) {
    mode = "ANY";
    allowedFunctionNames = [toolChoice.name];
  } else if ("function" in toolChoice) {
    mode = "ANY";
    allowedFunctionNames = [toolChoice.function.name];
  }

  // If "required" was requested without an explicit function, Gemini's ANY
  // mode lets the model choose among the declared functions.
  if (mode === "ANY" && !allowedFunctionNames && tools?.length === 1) {
    allowedFunctionNames = [tools[0].function.name];
  }

  return {
    functionCallingConfig: {
      mode,
      ...(allowedFunctionNames?.length ? { allowedFunctionNames } : {}),
    },
  };
}

function sanitizeGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeGeminiSchema);
  if (!value || typeof value !== "object") return value;

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  // Gemini's responseSchema / function-declaration schema is not full JSON Schema.
  // In particular, additionalProperties is not a supported field.
  for (const [key, child] of Object.entries(input)) {
    if (key === "additionalProperties" || key === "$schema" || key === "strict") continue;
    output[key] = sanitizeGeminiSchema(child);
  }

  return output;
}

function buildGenerationConfig(params: AIRequest) {
  const responseFormat = params.responseFormat || params.response_format;
  const outputSchema = params.outputSchema || params.output_schema;
  const format = responseFormat || (outputSchema
    ? {
        type: "json_schema" as const,
        json_schema: outputSchema,
      }
    : undefined);

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: params.maxTokens ?? params.max_tokens ?? 32768,
  };

  if (format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  if (format?.type === "json_schema") {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = sanitizeGeminiSchema(format.json_schema.schema);
  }

  return generationConfig;
}

function normalizeGeminiResponse(raw: any, model: string): InvokeResult {
  const candidate = raw?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  const textParts = parts
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text);

  const toolCalls = parts
    .filter((part: any) => part?.functionCall)
    .map((part: any, index: number) => ({
      id: `${raw?.responseId || raw?.response_id || "gemini"}-tool-${index}`,
      type: "function" as const,
      function: {
        name: part.functionCall.name,
        arguments: JSON.stringify(part.functionCall.args ?? {}),
      },
    }));

  return {
    id: raw?.responseId || `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: raw?.modelVersion || model,
    choices: [
      {
        index: candidate?.index ?? 0,
        message: {
          role: "assistant",
          content: textParts.join("\n"),
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: candidate?.finishReason ?? null,
      },
    ],
    usage: raw?.usageMetadata
      ? {
          prompt_tokens: raw.usageMetadata.promptTokenCount ?? 0,
          completion_tokens: raw.usageMetadata.candidatesTokenCount ?? 0,
          total_tokens: raw.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

export const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Google Gemini",
  capabilities: {
    chat: true,
    tools: true,
    jsonObject: true,
    jsonSchema: true,
    vision: true,
  },
  isConfigured: () => Boolean(ENV.geminiApiKey.trim()),
  invoke: async (params: AIRequest): Promise<InvokeResult> => {
    const apiKey = ENV.geminiApiKey.trim();
    if (!apiKey) {
      throw new AIProviderError({
        provider: "gemini",
        message: "GEMINI_API_KEY is not configured",
        retryable: false,
      });
    }

    const model = ENV.geminiModel.trim() || DEFAULT_MODEL;
    const { systemParts, contents } = convertMessages(params.messages);

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: buildGenerationConfig(params),
    };

    if (systemParts.length) {
      payload.systemInstruction = { parts: systemParts };
    }

    const tools = convertTools(params.tools);
    if (tools) payload.tools = tools;

    const toolConfig = convertToolConfig(
      params.toolChoice || params.tool_choice,
      params.tools,
    );
    if (toolConfig) payload.toolConfig = toolConfig;

    const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

    let lastRetryableError: AIProviderError | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const raw = await response.json();
          return normalizeGeminiResponse(raw, model);
        }

        const errorText = await response.text();
        const retryable =
          response.status === 408 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status >= 500;

        const error = new AIProviderError({
          provider: "gemini",
          status: response.status,
          retryable,
          message: `Gemini API call failed: ${response.status} ${response.statusText} – ${errorText}`,
        });

        if (!retryable || attempt === MAX_RETRIES) throw error;

        lastRetryableError = error;
        const delay = attempt === 1 ? 2000 : 5000;
        console.warn(`[AI Router] Gemini retornou ${response.status}; nova tentativa em ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
      } catch (error) {
        if (error instanceof AIProviderError) {
          if (!error.retryable || attempt === MAX_RETRIES) throw error;
          lastRetryableError = error;
          const delay = attempt === 1 ? 2000 : 5000;
          console.warn(`[AI Router] Gemini falhou; nova tentativa em ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        if (attempt === MAX_RETRIES) {
          throw new AIProviderError({
            provider: "gemini",
            retryable: true,
            message: `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          });
        }

        const delay = attempt === 1 ? 2000 : 5000;
        console.warn(`[AI Router] Gemini request falhou; nova tentativa em ${delay}ms (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
      }
    }

    throw lastRetryableError ?? new AIProviderError({
      provider: "gemini",
      retryable: true,
      message: "Gemini request failed after retries",
    });
  },
};
