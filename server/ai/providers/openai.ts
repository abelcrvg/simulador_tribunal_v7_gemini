import { getUserById } from "../../db";
import {
  normalizeMessageForProvider,
  normalizeResponseFormatForProvider,
  normalizeToolChoiceForProvider,
} from "../normalize";
import { AIProviderError } from "../errors";
import type { AIProvider, AIRequest } from "../types";
import type { InvokeResult } from "../../_core/llm";

async function resolveApiKey(params: AIRequest): Promise<string | undefined> {
  const globalKey = process.env.OPENAI_API_KEY?.trim();
  if (globalKey) return globalKey;

  if (params.userId) {
    try {
      const user = await getUserById(params.userId);
      return user?.openaiApiKey?.trim() || undefined;
    } catch (error) {
      console.error("[AI/OpenAI] Falha ao buscar API key do usuário:", error);
    }
  }

  return undefined;
}

export const openAIProvider: AIProvider = {
  id: "openai",
  name: "OpenAI",
  capabilities: {
    chat: true,
    tools: true,
    jsonObject: true,
    jsonSchema: true,
    vision: true,
  },
  isConfigured: async params => Boolean(await resolveApiKey(params)),
  invoke: async (params: AIRequest): Promise<InvokeResult> => {
    const apiKey = await resolveApiKey(params);
    if (!apiKey) {
      throw new AIProviderError({
        provider: "openai",
        message: "OpenAI API key is not configured",
      });
    }

    const payload: Record<string, unknown> = {
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o",
      messages: params.messages.map(normalizeMessageForProvider),
      max_tokens: params.maxTokens ?? params.max_tokens ?? 16384,
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIProviderError({
          provider: "openai",
          status: response.status,
          retryable: response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500,
          message: `OpenAI API call failed: ${response.status} ${response.statusText} – ${errorText}`,
        });
      }

      return (await response.json()) as InvokeResult;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError({
        provider: "openai",
        retryable: true,
        message: `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    }
  },
};
