import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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

  return ctx;
}

describe("Sistema de Recursos e Instâncias", () => {
  it("deve ter procedures de recurso disponíveis", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar se os procedures existem
    expect(caller.appeal).toBeDefined();
    expect(caller.appeal.create).toBeDefined();
    expect(caller.appeal.get).toBeDefined();
    expect(caller.appeal.judge).toBeDefined();
    expect(caller.appeal.getJudges).toBeDefined();
  });

  it("deve ter procedures de sessão para instâncias", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar se os procedures de sessão existem
    expect(caller.session).toBeDefined();
    expect(caller.session.get).toBeDefined();
    expect(caller.session.getChildSessions).toBeDefined();
  });

  it("deve retornar array vazio quando não há sessões filhas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Buscar sessões filhas de uma sessão inexistente
    const childSessions = await caller.session.getChildSessions({ 
      parentSessionId: 99999 
    });

    expect(Array.isArray(childSessions)).toBe(true);
    expect(childSessions.length).toBe(0);
  });
});
