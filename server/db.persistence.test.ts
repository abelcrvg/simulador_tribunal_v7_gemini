import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ failNextWrite: false }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    writeFile: async (...args: any[]) => {
      if (state.failNextWrite) {
        state.failNextWrite = false;
        throw new Error("falha simulada de escrita");
      }
      return (actual.writeFile as any)(...args);
    },
  };
});

import * as db from "./db";

describe("Persistência local", () => {
  it("continua gravando depois de uma falha na fila", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const message = (content: string) => ({
      sessionId: 7001,
      role: "sistema",
      senderName: "Tribunal",
      content,
      isAI: true,
    });

    await db.createMessage(message("primeira"));
    state.failNextWrite = true;
    await expect(db.createMessage(message("segunda"))).rejects.toThrow("falha simulada de escrita");
    await expect(db.createMessage(message("terceira"))).resolves.toBeGreaterThan(0);

    expect((await db.getSessionMessages(7001)).length).toBeGreaterThanOrEqual(3);
    errorLog.mockRestore();
  });
});
