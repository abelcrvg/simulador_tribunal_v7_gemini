import "dotenv/config";

export const ENV = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3.5-lightning:free",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "https://ollama.com",
  ollamaApiKey: process.env.OLLAMA_API_KEY ?? "",
  ollamaModel: process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Geração de imagens é opcional e desligada por padrão: consome créditos do
  // Forge e atualmente não é utilizável. Ative com IMAGE_GENERATION_ENABLED=true.
  imageGenerationEnabled: process.env.IMAGE_GENERATION_ENABLED === "true",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "auto",
  // OpenCode é o provedor principal. Por padrão reutilizamos o background
  // service (~/.local/state/opencode/service.json), sem precisar de chave.
  opencodeEnabled: process.env.OPENCODE_ENABLED ?? "true",
  opencodeBaseUrl: process.env.OPENCODE_BASE_URL ?? "",
  opencodePassword: process.env.OPENCODE_SERVER_PASSWORD ?? "",
  opencodeAgent: process.env.OPENCODE_AGENT ?? "tribunal-speaker",
  opencodeModel: process.env.OPENCODE_MODEL ?? "",
  opencodeProjectDir: process.env.OPENCODE_PROJECT_DIR ?? "",
  trialSecondaryConcurrency: Number(process.env.TRIAL_SECONDARY_CONCURRENCY ?? "2"),
  localAuth: process.env.LOCAL_AUTH === "true",
  openAIModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  manusModel: process.env.MANUS_MODEL ?? "gemini-2.5-flash",
};
