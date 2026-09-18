import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
        sessionId: session.sessionId,
      });

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.event.title).toBeDefined();
      expect(event.event.description).toBeDefined();
      expect(event.event.impact).toBeDefined();
    }, 60000);

    it("deve listar eventos de uma sessão", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const trial = await caller.trial.generate({ area: "penal" });
      const session = await caller.session.create({
        trialId: trial.trialId,
        userRole: "juiz",
      });

      const events = await caller.enhancements.events.list({
        sessionId: session.sessionId,
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
    }, 60000);

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
