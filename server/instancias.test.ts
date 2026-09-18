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

describe("Sistema de Instâncias Superiores", () => {
  it("deve ter procedure getById no router de appeal", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.appeal.getById).toBeDefined();
  });

  it("deve ter procedures de sessão para buscar sessões filhas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.session.getChildSessions).toBeDefined();
  });

  it("getChildSessions deve retornar array vazio quando não há sessões filhas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const childSessions = await caller.session.getChildSessions({ 
      parentSessionId: 99999 
    });

    expect(Array.isArray(childSessions)).toBe(true);
    expect(childSessions.length).toBe(0);
  });
});
