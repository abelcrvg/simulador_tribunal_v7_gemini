import { appRouter } from "./routers";
import * as db from "./db";

async function run() {
  console.log("=== TESTANDO MENSAGENS E CONTINUAR JULGAMENTO NO STF ===");

  const caller = appRouter.createCaller({
    user: { id: 1, openId: "test-user", name: "Min. Alexandre (Você)", role: "user" } as any,
    req: {} as any,
    res: {} as any,
  });

  const sessionId = 16;
  const session = await db.getSessionById(sessionId);
  if (!session) throw new Error("Sessão 16 não encontrada");
  console.log(`✓ Usando sessão ${sessionId} (trial ${session.trialId}, papel ${session.userRole})`);

  console.log("\n1. Testando fala inicial / continuar...");
  const firstContinue = await caller.message.continuar({ sessionId });
  console.log(`✓ Abertura da sessão:`);
  console.log(`  - Papel: [${firstContinue.role}]`);
  console.log(`  - Mensagem: ${firstContinue.content?.substring(0, 150)}...`);

  console.log("\n2. Testando 'Responder' (message.send) pelo Ministro usuário...");
  const tSend = Date.now();
  const sendRes = await caller.message.send({
    sessionId,
    content: "[PEDIDO DE APARTE]: Permite um breve aparte, eminente Relator?",
  });
  console.log(`✓ Resposta da IA recebida em ${((Date.now() - tSend) / 1000).toFixed(1)}s!`);
  console.log(`  - Quem respondeu: [${sendRes.role}]`);
  console.log(`  - Conteúdo: ${sendRes.content?.substring(0, 150)}...`);

  console.log("\n3. Testando 'Continuar Julgamento' (message.continuar)...");
  const tCont = Date.now();
  const continueRes = await caller.message.continuar({ sessionId });
  console.log(`✓ Continuação do julgamento em ${((Date.now() - tCont) / 1000).toFixed(1)}s!`);
  console.log(`  - Quem falou: [${continueRes.role}]`);
  console.log(`  - Conteúdo: ${continueRes.content ? continueRes.content.substring(0, 150) + "..." : "Aguardando usuário"}`);

  console.log("\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
  process.exit(0);
}

run().catch(err => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
