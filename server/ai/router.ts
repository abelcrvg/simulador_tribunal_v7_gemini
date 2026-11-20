import { AIProviderError } from "./errors";
import { openCodeProvider } from "./providers/opencode";
import { manusProvider } from "./providers/manus";
import { geminiProvider } from "./providers/gemini";
import { ollamaProvider } from "./providers/ollama";
import { openAIProvider } from "./providers/openai";
import { openRouterProvider } from "./providers/openrouter";
import type { AIProvider, AIProviderId, AIRequest, AIResponse } from "./types";

const providers: AIProvider[] = [
  openCodeProvider,
  openRouterProvider,
  geminiProvider,
  ollamaProvider,
  openAIProvider,
  manusProvider,
];

function preferredProvider(): AIProviderId | "auto" {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (
    value === "opencode" ||
    value === "openrouter" ||
    value === "ollama" ||
    value === "gemini" ||
    value === "openai" ||
    value === "manus"
  ) {
    return value;
  }
  return "auto";
}

// Ordem padrão definida pelo usuário: OpenCode primeiro (agrupa várias fontes
// gratuitas), OpenRouter em seguida (esgota os 13 modelos `:free`) e só depois
// Gemini/OpenAI/Ollama/Manus como último recurso.
function orderedProviders(): AIProvider[] {
  const preferred = preferredProvider();
  if (preferred === "auto" || preferred === "opencode") return providers;

  // Um provedor explicitamente escolhido (ex.: AI_PROVIDER=openrouter nos
  // testes) assume a dianteira; OpenCode volta para o fim da cadeia.
  return [
    ...providers.filter(p => p.id === preferred),
    ...providers.filter(p => p.id !== preferred && p.id !== "opencode"),
    ...providers.filter(p => p.id === "opencode"),
  ];
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
      console.error(`[AI Router] ${provider.name} falhou: ${providerError.message}`);

      // Só anuncia o próximo provedor se ele realmente estiver configurado;
      // caso contrário o log mente ("Fallback para Gemini") e repete
      // OpenRouter sem explicar por quê.
      const nextProvider = candidates
        .slice(candidates.indexOf(provider) + 1)
        .find(candidate => candidate.id !== provider.id);
      if (nextProvider && (await nextProvider.isConfigured(params))) {
        console.log(`[AI Router] Fallback para ${nextProvider.name}`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`Nenhum provedor de IA conseguiu atender à solicitação.\n${errors.join("\n")}`);
  }

  throw new Error(
    "Nenhum provedor de IA está configurado. Inicie o OpenCode (`opencode serve`) ou configure OPENROUTER_API_KEY, OLLAMA_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY ou BUILT_IN_FORGE_API_KEY.",
  );
}
