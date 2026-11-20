import { beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(id: number): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `owner-test-${id}`,
    email: `owner${id}@example.com`,
    name: `Usuário ${id}`,
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

let trialId: number;
let sessionId: number;
let appealId: number;
let customTrialId: number;

beforeAll(async () => {
  trialId = await db.createTrial({
    title: "Caso de posse",
    area: "penal",
    description: "Caso usado nos testes de acesso",
    facts: "Narrativa pública",
    legalBasis: "Art. 155 do CP",
    admiteJuri: false,
  });
  sessionId = await db.createSession({ userId: 1, trialId, userRole: "juiz" });
  appealId = await db.createAppeal({
    sessionId,
    tipo: "apelacao",
    recorrente: "defesa",
    razoes: "Nulidade",
    status: "pendente",
  });
  const secretTrialId = await db.createTrial({
    title: "Caso com verdade objetiva",
    area: "penal",
    description: "Teste de vazamento",
    facts: {
      publicNarrative: "Versão pública",
      objectiveTruth: "SEGREDO",
      knownFacts: [
        {
          role: "réu",
          person: "",
          facts: "SEGREDO VIVIDO",
          interest: "SEGREDO INTERESSE",
          fear: "SEGREDO MEDO",
        },
      ],
    } as any,
    legalBasis: "Art. 156 do CP",
    admiteJuri: false,
  });
  customTrialId = await db.createCustomTrial({
    userId: 1,
    trialId: secretTrialId,
    originalPrompt: "Caso de teste",
    isPublic: true,
    timesPlayed: 0,
    rating: 0,
    tags: null,
  });
});

describe("Controle de posse", () => {
  it("nega acesso a sessões de outro usuário", async () => {
    const owner = appRouter.createCaller(createAuthContext(1));
    const stranger = appRouter.createCaller(createAuthContext(2));

    await expect(owner.session.getById({ id: sessionId })).resolves.toBeTruthy();
    await expect(stranger.session.getById({ id: sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.session.get({ id: sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.session.updateStatus({ id: sessionId, status: "concluido" })).rejects.toThrow("Acesso negado");
    await expect(stranger.message.list({ sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.participant.list({ sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.juryVote.list({ sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.enhancements.events.list({ sessionId })).rejects.toThrow("Acesso negado");
  });

  it("nega acesso a dados do caso de outro usuário", async () => {
    const stranger = appRouter.createCaller(createAuthContext(2));

    await expect(stranger.evidence.list({ trialId })).rejects.toThrow("Acesso negado");
    await expect(stranger.document.list({ trialId })).rejects.toThrow("Acesso negado");
    await expect(stranger.vehicleHistory.list({ trialId })).rejects.toThrow("Acesso negado");
    await expect(stranger.trial.getTimeline({ trialId })).rejects.toThrow("Acesso negado");
    await expect(stranger.trial.getHearings({ trialId })).rejects.toThrow("Acesso negado");
    await expect(stranger.enhancements.visualDocs.list({ trialId })).rejects.toThrow("Acesso negado");
  });

  it("nega leitura e julgamento de recurso de outro usuário", async () => {
    const owner = appRouter.createCaller(createAuthContext(1));
    const stranger = appRouter.createCaller(createAuthContext(2));

    await expect(owner.appeal.get({ sessionId })).resolves.toBeTruthy();
    await expect(stranger.appeal.get({ sessionId })).rejects.toThrow("Acesso negado");
    await expect(stranger.appeal.getById({ appealId })).rejects.toThrow("Acesso negado");
    await expect(stranger.appeal.getJudges({ appealId })).rejects.toThrow("Acesso negado");
    await expect(stranger.appeal.judge({ appealId })).rejects.toThrow("Acesso negado");
  });

  it("não expõe a verdade objetiva em caso personalizado público", async () => {
    const caller = appRouter.createCaller(createAuthContext(2));
    const result: any = await caller.customTrial.getById({ id: customTrialId });

    expect(result.trial.facts.publicNarrative).toBe("Versão pública");
    expect(result.trial.facts.objectiveTruth).toBeUndefined();
    expect(result.trial.facts.knownFacts).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("SEGREDO");
  });
});
