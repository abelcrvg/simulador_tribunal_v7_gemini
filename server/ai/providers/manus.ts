import { ENV } from "../../_core/env";
import { AIProviderError } from "../errors";
import {
  normalizeMessageForProvider,
  normalizeResponseFormatForProvider,
  normalizeToolChoiceForProvider,
} from "../normalize";
import type { AIProvider, AIRequest } from "../types";
import type { InvokeResult } from "../../_core/llm";

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

export const manusProvider: AIProvider = {
  id: "manus",
  name: "Manus Forge",
  capabilities: {
    chat: true,
    tools: true,
    jsonObject: true,
    jsonSchema: true,
    vision: true,
  },
  isConfigured: () => Boolean(ENV.forgeApiKey),
  invoke: async (params: AIRequest): Promise<InvokeResult> => {
    if (!ENV.forgeApiKey) {
      throw new AIProviderError({
        provider: "manus",
        message: "BUILT_IN_FORGE_API_KEY is not configured",
      });
    }

    const payload: Record<string, unknown> = {
      model: process.env.MANUS_MODEL?.trim() || "gemini-2.5-flash",
      messages: params.messages.map(normalizeMessageForProvider),
      max_tokens: params.maxTokens ?? params.max_tokens ?? 32768,
      thinking: { budget_tokens: 128 },
    };

    if (params.tools?.length) payload.tools = params.tools;

    const toolChoice = normalizeToolChoiceForProvider(
      params.toolChoice || params.tool_choice,
      params.tools,
    );
    if (toolChoice) payload.tool_choice = toolChoice;

    const responseFormat = normalizeResponseFormatForProvider({
      responseFormat: params.responseFormat,
      response_format: params.response_format,
      outputSchema: params.outputSchema,
      output_schema: params.output_schema,
    });
    if (responseFormat) payload.response_format = responseFormat;

    try {
      const response = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIProviderError({
          provider: "manus",
          status: response.status,
          retryable: response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500,
          message: `Manus Forge call failed: ${response.status} ${response.statusText} – ${errorText}`,
        });
      }

      return (await response.json()) as InvokeResult;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError({
        provider: "manus",
        retryable: true,
        message: `Manus Forge request failed: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    }
  },
};
