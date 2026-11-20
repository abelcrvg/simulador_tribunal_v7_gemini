import { beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(id: number): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `campaign-user-${id}`,
    email: `campaign${id}@example.com`,
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

let progressId: number;

beforeAll(async () => {
  progressId = await db.createCampaignProgress({
    userId: 1,
    campaignId: 9001,
    currentCase: 1,
    completedCases: 0,
    decisions: "[]",
    status: "em_andamento",
  });
});

describe("Campanha - progresso", () => {
  it("avança o caso usando o progressId correto", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.campaign.advanceCase({
      progressId,
      decision: { caseNumber: 1, verdict: "procedente", keyChoices: ["art. 302"] },
    });

    expect(result).toEqual({ currentCase: 2, completedCases: 1 });
    const progress = await db.getCampaignProgressById(progressId);
    expect(progress?.currentCase).toBe(2);
    expect(JSON.parse(progress?.decisions || "[]")).toHaveLength(1);
  });

  it("nega avanço e conclusão a outro usuário", async () => {
    const caller = appRouter.createCaller(createAuthContext(2));
    await expect(
      caller.campaign.advanceCase({
        progressId,
        decision: { caseNumber: 2, verdict: "improcedente", keyChoices: [] },
      })
    ).rejects.toThrow("Progresso não encontrado");
    await expect(caller.campaign.complete({ progressId })).rejects.toThrow("Progresso não encontrado");
  });

  it("conclui a campanha do próprio usuário", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.campaign.complete({ progressId })).resolves.toEqual({ success: true });
    expect((await db.getCampaignProgressById(progressId))?.status).toBe("concluido");
  });
});
