import "dotenv/config";

export const ENV = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "https://ollama.com",
  ollamaApiKey: process.env.OLLAMA_API_KEY ?? "",
  ollamaModel: process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "auto",
  localAuth: process.env.LOCAL_AUTH === "true",
  openAIModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  manusModel: process.env.MANUS_MODEL ?? "gemini-2.5-flash",
};
