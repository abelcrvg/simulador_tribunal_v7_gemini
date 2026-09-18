import type {
  InvokeParams,
  InvokeResult,
  Tool,
  ToolChoice,
  ResponseFormat,
  OutputSchema,
} from "../_core/llm";

export type AIProviderId = "gemini" | "openai" | "manus";

export type AIRequest = InvokeParams;
export type AIResponse = InvokeResult;

export type AIProviderCapabilities = {
  chat: boolean;
  tools: boolean;
  jsonObject: boolean;
  jsonSchema: boolean;
  vision: boolean;
};

export type AIProvider = {
  id: AIProviderId;
  name: string;
  capabilities: AIProviderCapabilities;
  isConfigured: (params: AIRequest) => Promise<boolean> | boolean;
  invoke: (params: AIRequest) => Promise<AIResponse>;
};

export type AIRouterOptions = {
  preferredProvider?: AIProviderId | "auto";
};

export type { InvokeParams, InvokeResult, Tool, ToolChoice, ResponseFormat, OutputSchema };
