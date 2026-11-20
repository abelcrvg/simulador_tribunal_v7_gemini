/**
 * Teste de Integração — Modo STF
 * Valida o fluxo completo via appRouter.createCaller:
 * geração de caso → criação de sessão com participantes → abertura → mensagem → continuar
 * Usa mocks determinísticos de IA (sem rede).
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { AuthenticatedUser } from "./_core/auth";

// ============================================================
// MOCK DE IA — respostas determinísticas para cada prompt
// Estado interno ao factory (funciona com hoist do vi.mock)
// ============================================================
vi.mock("./_core/llm", () => {
  // Contador interno ao escopo do factory — sobrevive ao hoist
  const _state = { diretorCount: 0, genericCount: 0 };

  return {
  invokeLLM: vi.fn(async (req: any) => {
    const userContent: string =
      req.messages?.find((m: any) => m.role === "user")?.content ?? "";
    const systemContent: string =
      req.messages?.[0]?.content ?? "";

    // --- Geração de caso STF ---
    if (userContent.includes("SUPREMO TRIBUNAL FEDERAL") && userContent.includes("Gere um caso")) {
      return { choices: [{ message: { content: JSON.stringify({
        title: "ADI 9999 — Inconstitucionalidade da Lei Federal de Vigilância Digital",
        description: "Ação Direta de Inconstitucionalidade ajuizada pelo Conselho Federal da OAB questionando dispositivos da Lei nº 14.555/2023.",
        facts: "O art. 12 da Lei nº 14.555/2023 permite ao Executivo acessar metadados sem ordem judicial, violando o art. 5º, XII da CF/88.",
        area: "stf_constitucional",
        difficulty: "medio",
        admiteJuri: false,
        legalBasis: "Art. 5º, XII, CF/88 — sigilo das comunicações",
        jurisprudence: "RE 418.416-STF",
        timeline: "2023-03-01: Publicação da Lei. 2023-04-10: Ajuizamento da ADI.",
      }) } }] };
    }

    // --- Geração de participantes STF (prompt de geração de personagens) ---
    if (
      userContent.includes("COMPOSIÇÃO DO PLENÁRIO") ||
      userContent.includes("participantes_stf") ||
      (userContent.includes("Gere os participantes") && userContent.includes("STF"))
    ) {
      return { choices: [{ message: { content: JSON.stringify({
        participants: [
          { name: "Ministro Alexandre Faria", role: "ministro", description: "Presidente do STF. Coordena os trabalhos e proclama os resultados.", personality: "Firme, imparcial, formalista." },
          { name: "Ministra Carmen Lúcia Mendonça", role: "ministro", description: "Relatora. Especialista em direitos fundamentais.", personality: "Erudita, progressista." },
          { name: "Ministro Roberto Álvares", role: "ministro", description: "Vogal. Pragmático.", personality: "Conservador, cita precedentes internacionais." },
          { name: "Dr. Paulo Souza", role: "promotor", description: "Procurador-Geral da República — PGR.", personality: "Técnico, objetivo." },
          { name: "Dra. Fernanda Lima", role: "advogado_defesa", description: "Advogada Constitucionalista pela OAB.", personality: "Eloquente." },
          { name: "Dr. Marcos Vinicius", role: "assistente_acusacao", description: "Advogado-Geral da União — AGU.", personality: "Defende prerrogativas do Estado." },
        ],
      }) } }] };
    }

    // --- Geração de provas ---
    if (
      userContent.includes("provas") ||
      userContent.includes("evidências") ||
      userContent.includes("evidencias") ||
      userContent.includes("Evidências")
    ) {
      return { choices: [{ message: { content: JSON.stringify({
        evidencias: [
          { title: "Texto do Art. 12 da Lei nº 14.555/2023", description: "Dispositivo legal impugnado." },
          { title: "Relatório ANPD", description: "Risco alto ao direito fundamental de privacidade." },
        ],
      }) } }] };
    }

    // --- Cronologia ---
    if (userContent.includes("cronologia") || userContent.includes("timeline")) {
      return { choices: [{ message: { content: JSON.stringify({
        events: [
          { date: "2023-03-01", description: "Publicação da Lei nº 14.555/2023." },
          { date: "2023-04-10", description: "OAB ajuíza ADI 9999." },
        ],
        policeStatements: [],
      }) } }] };
    }

    // --- Histórico de audiências ---
    if (
      userContent.includes("audiência") ||
      userContent.includes("audiencias") ||
      systemContent.includes("audiência")
    ) {
      return { choices: [{ message: { content: JSON.stringify({
        audiencias: [{ data: "2024-02-01", tipo: "Sustentação Oral", resumo: "Partes apresentaram sustentação oral." }],
      }) } }] };
    }

    // --- Diretor de Audiência (timestamp garante unicidade contra deduplicação) ---
    if (
      systemContent.includes("Diretor") ||
      systemContent.includes("diretor") ||
      userContent.includes("PRINCÍPIO CENTRAL") ||
      userContent.includes("DIRETOR DE AUDIÊNCIA")
    ) {
      const ts = Date.now();
      return { choices: [{ message: { content: JSON.stringify({
        action: "fala",
        speakerRole: "ministro",
        targetRole: null,
        content: `Prosseguindo os trabalhos. [ref:${ts}] Concedo a palavra ao próximo Ministro para manifestação sobre o mérito constitucional.`,
      }) } }] };
    }

    // --- Fala genérica de participante IA (timestamp garante unicidade) ---
    const ts2 = Date.now();
    return { choices: [{ message: {
      content: `Senhor Presidente, registro minha manifestação sobre a ADI 9999. [ref:${ts2}] O art. 12 da Lei nº 14.555/2023 viola o art. 5º, XII da Constituição Federal.`,
    } }] };
  }),
  };
});

// ============================================================
// CONTEXTO DE AUTENTICAÇÃO FAKE (padrão do projeto)
// ============================================================
function createSTFContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "stf-test-user",
    email: "ministro@stf.test",
    name: "Ministro Relator",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

// ============================================================
// TESTES
// ============================================================
describe("🏛️ Fluxo STF — Integração Completa via tRPC", () => {
  let trialId: number;
  let sessionId: number;

  // ----------------------------------------------------------
  it("1. Deve gerar um caso STF com IA (trial.generate)", async () => {
    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);

    const trial = await caller.trial.generate({ area: "stf_constitucional", difficulty: "medio" });

    expect(trial).toBeDefined();
    // O router retorna { id, trialId, ...caseData } para retrocompatibilidade
    const id = (trial as any).id ?? (trial as any).trialId;
    expect(id).toBeGreaterThan(0);
    expect((trial as any).area).toBe("stf_constitucional");
    expect((trial as any).admiteJuri).toBe(false);

    trialId = id;
    console.log(`✅ Caso STF gerado: [${trialId}] ${(trial as any).title}`);
  }, 15000);

  // ----------------------------------------------------------
  it("2. Deve criar sessão STF (session.create) com role=ministro", async () => {
    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.session.create({
      trialId,
      userRole: "ministro",
      userName: "Ministro Relator",
    });

    // Retrocompatibilidade: pode ser { id } ou { sessionId } ou número direto
    const sid =
      typeof result === "number"
        ? result
        : (result as any).id ?? (result as any).sessionId;

    expect(sid).toBeGreaterThan(0);
    sessionId = sid;
    console.log(`✅ Sessão STF criada: ID ${sessionId}`);
  }, 20000);

  // ----------------------------------------------------------
  it("3. Plenário do STF deve ter ministros, PGR e advogados como participantes", async () => {
    const db = await import("./db");
    const participants = await db.getSessionParticipants(sessionId);
    const aiParticipants = participants.filter(p => !p.isUser);
    const ministros = participants.filter(p => p.role === "ministro");
    const promotor = participants.find(p => p.role === "promotor");
    const defesa = participants.find(p => p.role === "advogado_defesa");
    const userPart = participants.find(p => p.isUser);

    console.log(`\n📋 Participantes do Plenário (${participants.length}):`);
    participants.forEach(p =>
      console.log(`   - [${p.role.padEnd(20)}] ${p.name}${p.isUser ? " 👤 USUÁRIO" : ""}`)
    );

    expect(participants.length).toBeGreaterThanOrEqual(3);
    expect(ministros.length).toBeGreaterThanOrEqual(2);  // Usuário + pelo menos 1 Ministro IA
    expect(aiParticipants.length).toBeGreaterThan(0);
    expect(userPart).toBeDefined();
    expect(userPart!.role).toBe("ministro");
    // PGR ou Advogado deve existir
    expect(promotor || defesa).toBeTruthy();
  }, 10000);

  // ----------------------------------------------------------
  it("4. Deve abrir o julgamento STF (message.continuar) — abertura plenária", async () => {
    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.message.continuar({ sessionId });

    expect(result).toBeDefined();
    expect((result as any).content).toBeTruthy();

    const content = String((result as any).content);
    console.log(`✅ Abertura STF: "${content.slice(0, 100)}..."`);

    // A abertura deve ser uma fala de Ministro do Plenário ou da IA diretora
    expect(content.length).toBeGreaterThan(20);
  }, 15000);

  // ----------------------------------------------------------
  it("5. Deve enviar mensagem como Ministro (message.send) e receber resposta", async () => {
    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.message.send({
      sessionId,
      content: "Srª Presidente, passo ao relatório. O art. 12 da lei impugnada permite ao Executivo acessar metadados sem ordem judicial — violação direta ao art. 5º, XII da CF/88. Voto pela procedência da ADI.",
    });

    expect(result).toBeDefined();
    expect((result as any).content).toBeTruthy();
    expect((result as any).role).toBeTruthy();

    const content = String((result as any).content);
    const role = String((result as any).role);
    console.log(`✅ Resposta do STF [${role}]: "${content.slice(0, 100)}..."`);
    expect(content.length).toBeGreaterThan(20);
  }, 15000);

  // ----------------------------------------------------------
  it("6. Deve continuar o julgamento STF (message.continuar) com Diretor de Audiência", async () => {
    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.message.continuar({ sessionId });

    expect(result).toBeDefined();
    // Pode retornar waitingForUser ou uma fala de IA
    const content = (result as any).content;
    const waitingForUser = (result as any).waitingForUser;

    if (waitingForUser) {
      console.log(`✅ Diretor concedeu a palavra ao usuário (Ministro) — aguardando manifestação voluntária.`);
    } else {
      expect(content).toBeTruthy();
      console.log(`✅ Diretor continuou com IA: "${String(content).slice(0, 100)}..."`);
    }
  }, 15000);

  // ----------------------------------------------------------
  it("7. Histórico final deve ter sequência coerente de falas STF", async () => {
    const db = await import("./db");
    const messages = await db.getSessionMessages(sessionId);
    const realMessages = messages.filter((m: any) => m.role !== "sistema");

    console.log(`\n📜 Histórico da Sessão STF (${realMessages.length} falas):`);
    realMessages.forEach((m: any, i: number) => {
      const sender = m.senderName || m.role;
      const isAI = m.isAI ? "🤖" : "👤";
      console.log(`  ${i + 1}. ${isAI} [${m.role}] ${sender}: "${String(m.content).slice(0, 70)}..."`);
    });

    expect(realMessages.length).toBeGreaterThanOrEqual(3);

    // Todas as mensagens têm role e content
    for (const msg of realMessages) {
      expect(msg.role).toBeTruthy();
      expect(msg.content).toBeTruthy();
    }

    // Deve haver pelo menos 1 mensagem de ministro (usuário)
    const userMessages = realMessages.filter((m: any) => !m.isAI);
    expect(userMessages.length).toBeGreaterThanOrEqual(1);

    // Deve haver mensagens de IA (ministros ou outros papéis do STF)
    const aiMessages = realMessages.filter((m: any) => m.isAI);
    expect(aiMessages.length).toBeGreaterThanOrEqual(2);

    console.log(`\n✅ Sessão STF validada:`);
    console.log(`   👤 ${userMessages.length} falas do usuário`);
    console.log(`   🤖 ${aiMessages.length} falas de IA`);
    console.log(`   📋 Total: ${realMessages.length} manifestações`);
  }, 10000);
});
