import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { openRouterProvider } from "./openrouter";
import { getAIProviders, invokeWithAIRouter } from "../router";
import { invokeLLM } from "../../_core/llm";
import { ENV } from "../../_core/env";
import { AIProviderError } from "../errors";

describe("OpenRouter Provider", () => {
  const originalApiKey = ENV.openRouterApiKey;
  const originalModel = ENV.openRouterModel;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    ENV.openRouterApiKey = "sk-or-v1-testkey123456";
    ENV.openRouterModel = "openrouter/free";
  });

  afterEach(() => {
    ENV.openRouterApiKey = originalApiKey;
    ENV.openRouterModel = originalModel;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("deve possuir a identidade e capacidades corretas", () => {
    expect(openRouterProvider.id).toBe("openrouter");
    expect(openRouterProvider.name).toBe("OpenRouter");
    expect(openRouterProvider.capabilities.chat).toBe(true);
    expect(openRouterProvider.capabilities.jsonObject).toBe(true);
    expect(openRouterProvider.capabilities.jsonSchema).toBe(true);
  });

  it("deve validar isConfigured baseado na presença da API key", () => {
    ENV.openRouterApiKey = "sk-test";
    expect(openRouterProvider.isConfigured({ messages: [] })).toBe(true);

    ENV.openRouterApiKey = "";
    expect(openRouterProvider.isConfigured({ messages: [] })).toBe(false);
  });

  it("deve lançar erro se invocado sem OPENROUTER_API_KEY", async () => {
    ENV.openRouterApiKey = "";
    await expect(
      openRouterProvider.invoke({
        messages: [{ role: "user", content: "Olá" }],
      })
    ).rejects.toThrow("OPENROUTER_API_KEY não configurada");
  });

  it("deve chamar o endpoint https://openrouter.ai/api/v1/chat/completions com headers e payload adequados", async () => {
    const mockResponseData = {
      id: "gen-12345",
      created: 1731916800,
      model: "openrouter/free",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Prezado Juiz, a defesa requer a absolvição sumária.",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 25,
        completion_tokens: 15,
        total_tokens: 40,
      },
    };

    let capturedUrl = "";
    let capturedOptions: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      } as Response;
    });

    const result = await openRouterProvider.invoke({
      messages: [{ role: "user", content: "Manifeste-se a defesa." }],
    });

    expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(capturedOptions.method).toBe("POST");
    expect(capturedOptions.headers["Authorization"]).toBe("Bearer sk-or-v1-testkey123456");
    expect(capturedOptions.headers["HTTP-Referer"]).toBe("https://simulador-tribunal.local");
    expect(capturedOptions.headers["X-Title"]).toBe("Simulador de Tribunal");

    const parsedBody = JSON.parse(capturedOptions.body);
    expect(parsedBody.model).toBe("openrouter/free");
    expect(parsedBody.messages).toHaveLength(1);
    expect(parsedBody.messages[0].content).toBe("Manifeste-se a defesa.");

    expect(result.choices[0].message.content).toBe("Prezado Juiz, a defesa requer a absolvição sumária.");
    expect(result.usage?.total_tokens).toBe(40);
  });

  it("deve reforçar schema JSON no prompt e limpar markdown fences da resposta", async () => {
    const rawJson = JSON.stringify({ decisao: "deferido", fundamentacao: "Art. 397 CPP" });
    const markdownWrappedJson = `\`\`\`json\n${rawJson}\n\`\`\``;

    let capturedBody: any = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { role: "assistant", content: markdownWrappedJson },
            },
          ],
        }),
      } as Response;
    });

    const result = await openRouterProvider.invoke({
      messages: [{ role: "user", content: "Analise o pedido da defesa." }],
      outputSchema: {
        name: "decisao_schema",
        schema: {
          type: "object",
          properties: { decisao: { type: "string" }, fundamentacao: { type: "string" } },
        },
      },
    });

    // Confirma reforço no prompt do usuário
    expect(capturedBody.messages[0].content).toContain("RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO");
    expect(capturedBody.messages[0].content).toContain("ESTRUTURA ESPERADA");

    // Confirma que os blocos ```json ... ``` foram removidos
    expect(result.choices[0].message.content).toBe(rawJson);
    const parsed = JSON.parse(result.choices[0].message.content as string);
    expect(parsed.decisao).toBe("deferido");
  });

  it("deve retentar sem response_format se o modelo gratuito retornar erro 400 de suporte a schema", async () => {
    let callCount = 0;
    let callBodies: any[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      callCount++;
      callBodies.push(JSON.parse(options.body));

      if (callCount === 1) {
        return {
          ok: false,
          status: 400,
          text: async () => "Provider does not support response_format json_schema",
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { role: "assistant", content: '{"status":"ok"}' },
            },
          ],
        }),
      } as Response;
    });

    const result = await openRouterProvider.invoke({
      messages: [{ role: "user", content: "Gere o resumo." }],
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "resumo", schema: { type: "object" } },
      },
    });

    expect(callCount).toBe(2);
    expect(callBodies[0].response_format).toBeDefined();
    expect(callBodies[1].response_format).toBeUndefined();
    expect(result.choices[0].message.content).toBe('{"status":"ok"}');
  });

  it("deve tratar rate-limit (429) como retryable", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded on free model",
      } as Response;
    });

    try {
      await openRouterProvider.invoke({
        messages: [{ role: "user", content: "Teste" }],
      });
      expect.fail("Deveria ter lançado erro");
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      const providerError = error as AIProviderError;
      expect(providerError.provider).toBe("openrouter");
      expect(providerError.status).toBe(429);
      expect(providerError.retryable).toBe(true);
    }
  });
});

describe("AI Router com OpenRouter", () => {
  it("deve incluir o OpenRouter na lista de provedores do sistema", () => {
    const list = getAIProviders();
    const openrouter = list.find(p => p.id === "openrouter");
    expect(openrouter).toBeDefined();
    expect(openrouter?.name).toBe("OpenRouter");
  });

  it("deve funcionar através da função de fachada invokeLLM()", async () => {
    ENV.openRouterApiKey = "sk-test-key";
    ENV.aiProvider = "openrouter";
    process.env.AI_PROVIDER = "openrouter";

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { role: "assistant", content: "Resposta via invokeLLM e OpenRouter" },
            },
          ],
        }),
      } as Response;
    });

    const response = await invokeLLM({
      messages: [{ role: "user", content: "Teste de fachada" }],
    });

    expect(response.choices[0].message.content).toBe("Resposta via invokeLLM e OpenRouter");
  });
});
