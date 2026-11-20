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
          { name: "Ministro Aureliano Bastos", role: "ministro", description: "[PRESIDENTE] Presidente do STF. Coordena os trabalhos e proclama os resultados.", personality: "Solene, imparcial, rigoroso no regimento." },
          { name: "Ministra Heloísa Camargo", role: "ministro", description: "[VICE-PRESIDENTE] Vice-Presidente do STF. Substitui a presidência.", personality: "Serena e precisa." },
          { name: "Ministro Rafael Nogueira", role: "ministro", description: "[VOGAL] Vogal. Constitucionalista estrito.", personality: "Técnico, fiel à literalidade da CF/88." },
          { name: "Ministra Beatriz Alencar", role: "ministro", description: "[VOGAL] Vogal. Perfil garantista.", personality: "Erudita, interpretação evolutiva." },
          { name: "Ministro Otávio Ribeiro", role: "ministro", description: "[VOGAL] Vogal. Consequencialista.", personality: "Pragmático, atento à estabilidade." },
          { name: "Ministra Clara Villela", role: "ministro", description: "[VOGAL] Vogal. Especialista em federalismo.", personality: "Analítica, firme na separação de poderes." },
          { name: "Ministro Sérgio Portela", role: "ministro", description: "[VOGAL] Vogal. Proporcionalidade e razoabilidade.", personality: "Metódico, propõe modulação." },
          { name: "Ministra Luísa Andrade", role: "ministro", description: "[VOGAL] Vogal. Direitos sociais.", personality: "Empática, argumenta com princípios." },
          { name: "Ministro Henrique Salgado", role: "ministro", description: "[VOGAL] Vogal. Segurança jurídica.", personality: "Respeitador do stare decisis." },
          { name: "Ministra Marta Coimbra", role: "ministro", description: "[VOGAL] Vogal. Controle concentrado.", personality: "Precisa, gosta de fixar teses." },
          { name: "Dr. Paulo Souza", role: "promotor", description: "Procurador-Geral da República (PGR). Atua pelo MPF perante o STF.", personality: "Técnico, objetivo." },
          { name: "Dra. Fernanda Lima", role: "advogado_defesa", description: "Advogada da Tribuna. Sustentação pela parte autora.", personality: "Eloquente." },
          { name: "Dr. Marcos Vinicius", role: "assistente_acusacao", description: "Advogado-Geral da União (AGU). Defesa da norma impugnada.", personality: "Sóbrio, pródigo em precedentes." },
        ],
      }) } }] };
    }

    // --- Geração de provas ---
    if (userContent.includes("Gere provas realistas e detalhadas")) {
      return { choices: [{ message: { content: JSON.stringify({
        evidences: [
          { type: "documental", title: "Texto do Art. 12 da Lei nº 14.555/2023", description: "Dispositivo legal impugnado.", details: "Autoriza acesso a metadados sem ordem judicial." },
          { type: "pericial", title: "Relatório ANPD", description: "Risco alto ao direito fundamental de privacidade.", details: "Auditoria técnica de impacto à privacidade." },
        ],
      }) } }] };
    }

    // --- Geração de documentos ---
    if (userContent.includes("Gere documentos realistas e COMPLETOS")) {
      return { choices: [{ message: { content: JSON.stringify({
        documents: [
          { type: "parecer_juridico", title: "Parecer da OAB", description: "Fundamentos da ADI.", content: "Parecer completo.", issueDate: "2023-04-10", issuer: "Conselho Federal da OAB", relevance: "alta" },
        ],
      }) } }] };
    }

    // --- Cronologia ---
    if (userContent.includes("CRONOLOGIA COMPLETA")) {
      return { choices: [{ message: { content: JSON.stringify({
        timeline: [
          { date: "2023-03-01", description: "Publicação da Lei nº 14.555/2023." },
          { date: "2023-04-10", description: "OAB ajuíza ADI 9999." },
        ],
        crimeSceneReport: "Não aplicável.",
        policeStatements: [],
        evidenceQuality: "alta",
        evidenceQualityNote: "Documentação robusta.",
      }) } }] };
    }

    // --- Histórico de audiências ---
    if (userContent.includes("ESCRIVÃO DE TRIBUNAL")) {
      return { choices: [{ message: { content: JSON.stringify({
        hearings: [{ type: "inicial", date: "2024-02-01 às 14h", summary: "Sustentação oral das partes.", intermediateDecisions: "Nenhuma.", wasPostponed: "nao", postponementReason: null }],
      }) } }] };
    }

    // --- Diretor de Audiência (timestamp garante unicidade contra deduplicação) ---
    if (userContent.includes("Você é o DIRETOR DE AUDIÊNCIA de um simulador")) {
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

    // 10 ministros de IA + o usuário (11ª cadeira) + PGR + tribuna + AGU
    expect(ministros).toHaveLength(11);
    expect(aiParticipants.filter(p => p.role === "ministro")).toHaveLength(10);
    expect(participants).toHaveLength(14);
    expect(userPart).toBeDefined();
    expect(userPart!.role).toBe("ministro");
    expect(userPart!.name).toBe("Ministro Relator"); // nome informado em session.create
    expect(userPart!.description).toContain("[RELATOR]");
    expect(promotor).toBeTruthy();
    expect(promotor!.description).toContain("PGR");
    expect(defesa).toBeTruthy();
    expect(participants.find(p => p.role === "assistente_acusacao")!.description).toContain("AGU");

    // Cargos: exatamente um Presidente e um Vice-Presidente entre os ministros IA
    const aiMinisters = aiParticipants.filter(p => p.role === "ministro");
    expect(aiMinisters.filter(p => p.description?.includes("[PRESIDENTE]"))).toHaveLength(1);
    expect(aiMinisters.filter(p => p.description?.includes("[VICE-PRESIDENTE]"))).toHaveLength(1);
    expect(aiMinisters.filter(p => p.description?.includes("[VOGAL]"))).toHaveLength(8);
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

  // ----------------------------------------------------------
  it("8. Deve apurar maioria de 6 votos e proclamar o acórdão", async () => {
    const db = await import("./db");
    const ministers = (await db.getSessionParticipants(sessionId))
      .filter(p => p.role === "ministro");

    // Garante 6 votos explícitos de ministros diferentes (maioria de 11).
    for (const minister of ministers.slice(0, 6)) {
      await db.createMessage({
        sessionId,
        role: "ministro",
        senderName: minister.name,
        content: `[VOTO]: Acompanho o Relator e voto pela PROCEDENTE da ADI, por violação ao art. 5º, XII da CF/88. Fixo a tese com modulação de efeitos.`,
        isAI: minister.isUser ? false : true,
      });
    }

    const { ctx } = createSTFContext();
    const caller = appRouter.createCaller(ctx);
    const result: any = await caller.message.proclamar({ sessionId });

    expect(result.concluded).toBe(true);
    expect(result.tally.total).toBeGreaterThanOrEqual(6);
    expect(result.tally.majorityReached).toBe(true);
    expect(result.tally.procedente).toBeGreaterThanOrEqual(6);
    expect(result.presidenteName).toContain("Aureliano Bastos");
    expect(result.content).toBeTruthy();

    const sessao = await db.getSessionById(sessionId);
    expect(sessao?.status).toBe("concluido");
    expect(sessao?.decisionDetails).toContain("acordao_stf");
  }, 15000);
});
