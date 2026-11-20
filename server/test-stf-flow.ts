import { generateTrialWithAI, generateParticipantsForTrial } from "./routers";
import * as db from "./db";

async function main() {
  console.log("=== INICIANDO TESTE DO FLUXO STF ===");
  const t0 = Date.now();

  console.log("1. Gerando caso STF com IA...");
  const trial = await generateTrialWithAI("stf_constitucional", "medio", 1);
  console.log(`Caso gerado com sucesso em ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
  console.log(`- ID: ${trial.id}`);
  console.log(`- Título: ${trial.title}`);
  console.log(`- Área: ${trial.area}`);

  console.log("\n2. Criando sessão STF...");
  const sessionId = await db.createSession({
    userId: 1,
    trialId: trial.id,
    userRole: "ministro",
    instancia: "terceira",
    status: "em_andamento",
  });

  await db.createParticipant({
    sessionId,
    role: "ministro",
    name: "Ministro Relator (Você)",
    description: "Ministro da Suprema Corte",
    isUser: true,
  });

  console.log("3. Gerando participantes da Suprema Corte...");
  const tp0 = Date.now();
  await generateParticipantsForTrial(trial.id, "ministro");
  console.log(`Participantes gerados em ${((Date.now() - tp0) / 1000).toFixed(1)}s`);

  const participants = await db.getSessionParticipants(sessionId);
  console.log(`Total participantes: ${participants.length}`);

  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
