import { getIO } from "./socket";

export function broadcastSessionMessage(sessionId: number, message: unknown) {
  try {
    getIO()?.to(`session-${sessionId}`).emit("new-message", message);
  } catch (error) {
    console.warn("[Socket] Falha ao transmitir mensagem da sessão:", error);
  }
}
