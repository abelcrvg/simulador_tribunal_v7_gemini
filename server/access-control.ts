import * as db from "./db";

export async function requireOwnedSession(sessionId: number, userId: number) {
  const session = await db.getSessionById(sessionId);
  if (!session) throw new Error("Sessão não encontrada");
  if (session.userId !== userId) throw new Error("Acesso negado");
  return session;
}

export async function requireTrialAccess(trialId: number, userId: number) {
  const trial = await db.getTrialById(trialId);
  if (!trial) throw new Error("Caso não encontrado");
  const sessions = await db.getTrialSessions(trialId);
  if (sessions.length > 0 && !sessions.some(s => s.userId === userId)) {
    throw new Error("Acesso negado");
  }
  return trial;
}

export async function requireOwnedAppeal(appealId: number, userId: number) {
  const appeal = await db.getAppealById(appealId);
  if (!appeal) throw new Error("Recurso não encontrado");
  await requireOwnedSession(Number(appeal.sessionId), userId);
  return appeal;
}
