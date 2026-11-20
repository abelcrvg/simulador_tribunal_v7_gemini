import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock invokeLLM e generateImage para testes determinísticos sem depender de rede/quota
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async (params: any) => {
    const userPrompt = params.messages?.find((m: any) => m.role === "user")?.content || "";

    // 1. Caso de Campanha
    if (typeof userPrompt === "string" && userPrompt.includes("narrativa jurídica conectada")) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                mainStory: "Conspiração Corporativa e Fraude Tributária",
                cases: [
                  { caseNumber: 1, title: "Fraude Fiscal Inicial", description: "Sonegação", connection: "Início", consequences: "Investigação deflagrada" },
                  { caseNumber: 2, title: "Lavagem de Capitais", description: "Ocultação", connection: "Meio", consequences: "Bloqueio de bens" },
                  { caseNumber: 3, title: "Corrupção no Judiciário", description: "Suborno", connection: "Fim", consequences: "Sentença condenatória" },
                ],
              }),
            },
          },
        ],
      };
    }

    // 2. Caso Personalizado
    if (typeof userPrompt === "string" && (userPrompt.includes("crie um caso jurídico completo") || userPrompt.includes("motorista"))) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                title: "Atropelamento na Faixa de Pedestre",
                area: "penal",
                description: "Motorista em alta velocidade e ao celular atropelou vítima na faixa de pedestres.",
                facts: "O acusado trafegava em via urbana desrespeitando a sinalização semafórica.",
                legalBasis: "Art. 302 da Lei nº 9.503/1997 (Código de Trânsito Brasileiro)",
                jurisprudence: "STJ - REsp 1.845.221/SP",
                admiteJuri: false,
                timeline: "15/03/2024: Ocorrência do sinistro",
              }),
            },
          },
        ],
      };
    }

    // 3. Evento Aleatório
    if (typeof userPrompt === "string" && userPrompt.includes("Gere um evento aleatório")) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                title: "Testemunha Apresenta Gravação",
                description: "Durante a sessão, a testemunha ocular revelou gravação inédita em áudio.",
                impact: {
                  type: "positivo",
                  affectedParty: "defesa",
                  details: "Comprova que o acusado não estava no local no momento exato dos fatos.",
                },
              }),
            },
          },
        ],
      };
    }

    // 4. Default: Geração de Casos e Provas do Trial
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              title: "Homicídio Qualificado",
              area: "penal",
              description: "Homicídio ocorrido na região central após desavença.",
              facts: {
                publicNarrative: "Disparos efetuados em via pública na madrugada.",
                objectiveTruth: "Houve legítima defesa após agressão física injusta.",
              },
              legalBasis: "Art. 121, § 2º, incisos II e IV do Código Penal",
              jurisprudence: "STF - HC 123.456",
              admiteJuri: true,
              evidences: [
                {
                  type: "pericial",
                  title: "Laudo Necroscópico",
                  description: "Exame cadavérico do IML",
                  details: "Disparo único no tórax",
                },
              ],
              documents: [
                {
                  type: "boletim_ocorrencia",
                  title: "BO nº 1234/2024",
                  description: "Registro da Polícia Civil",
                  content: "Registro formal da ocorrência na 1ª Delegacia de Polícia.",
                  issueDate: "2024-01-15",
                  issuer: "1ª Delegacia de Polícia",
                  relevance: "alta",
                },
              ],
              participants: [
                {
                  role: "juiz",
                  name: "Dr. Marcelo Ramos",
                  description: "Juiz Titular da Vara do Júri",
                  personality: "Técnico, rigoroso e imparcial",
                },
              ],
            }),
          },
        },
      ],
    };
  }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: "https://example.com/mock-evidence-image.png",
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Novas Funcionalidades", () => {
  describe("Campanhas", () => {
    it("deve listar campanhas públicas", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const campaigns = await caller.campaign.list();
      expect(Array.isArray(campaigns)).toBe(true);
    });

    it("deve criar uma campanha com IA", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.campaign.create({
        title: "Crimes contra o Patrimônio",
        description: "Série de casos sobre furto, roubo e estelionato",
        difficulty: "medio",
        totalCases: 3,
      });

      expect(result.campaignId).toBeDefined();
      expect(result.storyline).toBeDefined();
      expect(result.storyline.mainStory).toBeDefined();
      expect(result.storyline.cases).toHaveLength(3);
    }, 30000);
  });

  describe("Casos Personalizados", () => {
    it("deve criar caso personalizado a partir de texto", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customTrial.create({
        prompt:
          "Um motorista atropelou um pedestre na faixa de pedestres enquanto falava ao celular. O pedestre sofreu fraturas e ficou 3 meses afastado do trabalho. Testemunhas confirmam que o sinal estava vermelho para o motorista.",
        isPublic: false,
      });

      expect(result.customTrialId).toBeDefined();
      expect(result.trialId).toBeDefined();
      expect(result.trial.title).toBeDefined();
      expect(result.trial.area).toBeDefined();
      expect(result.trial.facts).toBeDefined();
    }, 30000);

    it("deve listar casos personalizados do usuário", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const trials = await caller.customTrial.myTrials();
      expect(Array.isArray(trials)).toBe(true);
    });
  });

  describe("Eventos Aleatórios", () => {
    it("deve gerar evento aleatório para uma sessão", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Primeiro criar um trial e sessão
      const trial = await caller.trial.generate({ area: "penal" });
      const session = await caller.session.create({
        trialId: trial.trialId,
        userRole: "juiz",
      });

      // Gerar evento
      const event = await caller.enhancements.events.generate({
        sessionId: session.sessionId || session.id,
      });

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.event.title).toBeDefined();
      expect(event.event.description).toBeDefined();
      expect(event.event.impact).toBeDefined();
    }, 30000);

    it("deve listar eventos de uma sessão", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const trial = await caller.trial.generate({ area: "penal" });
      const session = await caller.session.create({
        trialId: trial.trialId,
        userRole: "juiz",
      });

      const events = await caller.enhancements.events.list({
        sessionId: session.sessionId || session.id,
      });

      expect(Array.isArray(events)).toBe(true);
    }, 30000);
  });

  describe("Documentos Visuais", () => {
    it("deve gerar documento visual com IA", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Criar um trial primeiro
      const trial = await caller.trial.generate({ area: "homicidio" });

      // Gerar documento visual
      const doc = await caller.enhancements.visualDocs.generate({
        trialId: trial.trialId,
        category: "cena_crime",
      });

      expect(doc.docId).toBeDefined();
      expect(doc.imageUrl).toBeDefined();
      expect(doc.title).toBeDefined();
    }, 30000);

    it("deve listar documentos visuais de um trial", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const trial = await caller.trial.generate({ area: "penal" });

      const docs = await caller.enhancements.visualDocs.list({
        trialId: trial.trialId,
      });

      expect(Array.isArray(docs)).toBe(true);
    }, 30000);
  });
});
