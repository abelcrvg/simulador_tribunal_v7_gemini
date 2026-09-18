import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
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

describe("Sistema Multiplayer", () => {
  it("deve criar uma sala com sucesso", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const room = await caller.multiplayer.createRoom({
      maxPlayers: 5,
      isPublic: false,
    });

    expect(room).toBeDefined();
    expect(room.id).toBeTypeOf("number");
    expect(room.code).toHaveLength(6);
  });

  it("deve entrar em uma sala existente", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const caller1 = appRouter.createCaller(ctx1);

    // Criar sala
    const room = await caller1.multiplayer.createRoom({
      maxPlayers: 5,
      isPublic: true,
    });

    // Outro usuário entra na sala
    const { ctx: ctx2 } = createAuthContext(2);
    const caller2 = appRouter.createCaller(ctx2);

    const result = await caller2.multiplayer.joinRoom({
      code: room.code,
    });

    expect(result.room).toBeDefined();
    expect(result.room.id).toBe(room.id);
    expect(result.players).toBeDefined();
    expect(result.players.length).toBeGreaterThanOrEqual(2);
  });

  it("deve listar salas públicas", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Criar sala pública
    await caller.multiplayer.createRoom({
      maxPlayers: 5,
      isPublic: true,
    });

    // Listar salas públicas
    const rooms = await caller.multiplayer.listPublicRooms();

    expect(rooms).toBeDefined();
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
  });

  it("deve obter informações de uma sala", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Criar sala
    const room = await caller.multiplayer.createRoom({
      maxPlayers: 5,
      isPublic: false,
    });

    // Obter informações
    const roomInfo = await caller.multiplayer.getRoom({
      roomId: room.id,
    });

    expect(roomInfo).toBeDefined();
    expect(roomInfo.room.id).toBe(room.id);
    expect(roomInfo.players).toBeDefined();
    expect(roomInfo.players.length).toBeGreaterThanOrEqual(1);
  });

  it("deve sair de uma sala", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Criar sala
    const room = await caller.multiplayer.createRoom({
      maxPlayers: 5,
      isPublic: false,
    });

    // Sair da sala
    const result = await caller.multiplayer.leaveRoom({
      roomId: room.id,
    });

    expect(result.success).toBe(true);
  });

  it("não deve permitir entrar em sala cheia", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const caller1 = appRouter.createCaller(ctx1);

    // Criar sala com 2 jogadores no máximo
    const room = await caller1.multiplayer.createRoom({
      maxPlayers: 2,
      isPublic: true,
    });

    // Segundo jogador entra
    const { ctx: ctx2 } = createAuthContext(2);
    const caller2 = appRouter.createCaller(ctx2);
    await caller2.multiplayer.joinRoom({ code: room.code });

    // Terceiro jogador tenta entrar (deve falhar)
    const { ctx: ctx3 } = createAuthContext(3);
    const caller3 = appRouter.createCaller(ctx3);

    await expect(
      caller3.multiplayer.joinRoom({ code: room.code })
    ).rejects.toThrow("Sala está cheia");
  });

  it("não deve permitir entrar em sala com código inválido", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.multiplayer.joinRoom({ code: "XXXXXX" })
    ).rejects.toThrow("Sala não encontrada");
  });
});
