import { AIProviderError } from "./errors";
import { manusProvider } from "./providers/manus";
import { geminiProvider } from "./providers/gemini";
import { ollamaProvider } from "./providers/ollama";
import { openAIProvider } from "./providers/openai";
import type { AIProvider, AIProviderId, AIRequest, AIResponse } from "./types";

const providers: AIProvider[] = [ollamaProvider, geminiProvider, openAIProvider, manusProvider];

function preferredProvider(): AIProviderId | "auto" {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (value === "gemini" || value === "openai" || value === "manus") return value;
  return "auto";
}

function orderedProviders(): AIProvider[] {
  const preferred = preferredProvider();
  if (preferred === "auto") return providers;
  return [...providers.filter(p => p.id === preferred), ...providers.filter(p => p.id !== preferred)];
}

export function getAIProviders() {
  return providers.map(provider => ({
    id: provider.id,
    name: provider.name,
    capabilities: provider.capabilities,
  }));
}

export async function invokeWithAIRouter(params: AIRequest): Promise<AIResponse> {
  const candidates = orderedProviders();
  const errors: string[] = [];

  for (const provider of candidates) {
    const configured = await provider.isConfigured(params);
    if (!configured) continue;

    try {
      console.log(`[AI Router] Usando ${provider.name}`);
      const result = await provider.invoke(params);
      console.log(`[AI Router] ${provider.name} respondeu com sucesso`);
      return result;
    } catch (error) {
      const providerError = error instanceof AIProviderError ? error : new AIProviderError({
        provider: provider.id,
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
        cause: error,
      });

      errors.push(`${provider.name}: ${providerError.message}`);
      console.error(`[AI Router] ${provider.name} falhou`, providerError);

      if (!providerError.retryable) throw providerError;
    }
  }

  if (errors.length) {
    throw new Error(`Nenhum provedor de IA conseguiu atender à solicitação.\n${errors.join("\n")}`);
  }

  throw new Error(
    "Nenhum provedor de IA está configurado. Configure GEMINI_API_KEY, OPENAI_API_KEY ou BUILT_IN_FORGE_API_KEY.",
  );
}
