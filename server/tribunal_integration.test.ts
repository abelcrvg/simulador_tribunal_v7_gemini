/**
 * Teste de Integração — Fluxo comum do Tribunal (1ª instância)
 * Valida geração de caso, Participantes, mensagens, continuação e sentença
 * via appRouter.createCaller, com mocks determinísticos de IA (sem rede).
 */
import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { AuthenticatedUser } from "./_core/auth";

vi.mock("./_core/llm", () => {
  const _state = { count: 0 };

  return {
    invokeLLM: vi.fn(async (req: any) => {
      const userContent: string =
        req.messages?.find((m: any) => m.role === "user")?.content ?? "";
      const systemContent: string = req.messages?.[0]?.content ?? "";

      if (userContent.includes("Você é o JUIZ responsável por este julgamento")) {
        return { choices: [{ message: { content: JSON.stringify({
          veredicto: "culpado",
          sentencaFundamentada: "RELATÓRIO. O Ministério Público denunciou o réu pelo crime descrito na denúncia. FUNDAMENTAÇÃO. A prova oral e documental colhida em audiência demonstra a autoria e a materialidade. DISPOSITIVO. Julgo procedente a ação penal.",
          relatorio: "O Ministério Público denunciou o réu pelo crime descrito na denúncia.",
          fundamentacao: "A prova oral e documental demonstra autoria e materialidade.",
          dispositivo: "Julgo procedente a ação penal.",
          dosimetria: {
            penaBase: "4 anos",
            agravantes: "Nenhuma",
            atenuantes: "Confissão espontânea",
            causasAumento: "Nenhuma",
            causasReducao: "Nenhuma",
            regime: "Semiaberto",
            substituicao: "Não cabível",
          },
          valoresIndenizacao: null,
          prazosPagamento: null,
          statusCumprimento: "pendente",
          recursosCabiveis: ["apelacao"],
          fundamentacaoLegal: ["Art. 121 do Código Penal"],
          observacoes: "Sentença gerada em teste de integração.",
        }) } }] };
      }

      if (userContent.includes("Gere nomes fictícios, descrições e PERSONALIDADES")) {
        return { choices: [{ message: { content: JSON.stringify({
          participants: [
            { role: "advogado_defesa", name: "Dr. Paulo Mendes", description: "Advogado - OAB/SP 123.456", personality: "Estratégico e cauteloso" },
            { role: "promotor", name: "Dra. Ana Ribeiro", description: "Promotora de Justiça - MP/SP", personality: "Firme e objetiva" },
            { role: "testemunha", name: "José Roberto Alves", description: "35 anos, motorista", personality: "Nervoso, mas preciso" },
            { role: "perito", name: "Dr. Carlos Lima", description: "Perito Médico Legista - CRM 98765/RJ", personality: "Técnico e impassível" },
            { role: "jurado", name: "Maria Aparecida Souza", description: "42 anos, professora", personality: "Reflexiva e imparcial" },
          ],
        }) } }] };
      }

      if (userContent.includes("CONTEXTO EDUCACIONAL") && userContent.includes("Gere um caso jurídico")) {
        return { choices: [{ message: { content: JSON.stringify({
          title: "Homicídio na Praça Central",
          area: "penal",
          description: "Caso fictício de homicídio ocorrido em via pública.",
          facts: {
            publicNarrative: "O réu teria discutido com a vítima antes dos fatos.",
            objectiveTruth: "A vítima iniciou a agressão, mas o réu reagiu com uso excessivo de força.",
          },
          legalBasis: "Art. 121 do Código Penal",
          jurisprudence: "STJ - REsp 1.000.000",
          admiteJuri: true,
        }) } }] };
      }

      if (userContent.includes("Gere provas realistas e detalhadas")) {
        return { choices: [{ message: { content: JSON.stringify({
          evidences: [{ title: "Laudo Necroscópico", description: "Exame do IML", type: "pericial", details: "Ferimento por arma branca", origem: "IML", dataColeta: "15/03/2024", custodia: "Recebido pelo juízo em 16/03/2024, sem quebra de lacre." }],
        }) } }] };
      }

      if (userContent.includes("Gere documentos realistas e COMPLETOS")) {
        return { choices: [{ message: { content: JSON.stringify({
          documents: [{ title: "Boletim de Ocorrência", description: "Registro da ocorrência", type: "boletim_ocorrencia", content: "Registro formal.", issueDate: "2024-01-15", issuer: "Delegacia", relevance: "alta" }],
        }) } }] };
      }

      if (userContent.includes("CRONOLOGIA COMPLETA")) {
        return { choices: [{ message: { content: JSON.stringify({
          timeline: [{ date: "2024-01-15", description: "Ocorrência dos fatos." }],
          crimeSceneReport: "Praça central.",
          policeStatements: [],
          evidenceQuality: "alta",
          evidenceQualityNote: "Laudo disponível.",
        }) } }] };
      }

      if (userContent.includes("ESCRIVÃO DE TRIBUNAL")) {
        return { choices: [{ message: { content: JSON.stringify({
          hearings: [{ type: "inicial", date: "2024-02-01 às 14h", summary: "Audiência de instrução.", intermediateDecisions: "Nenhuma.", wasPostponed: "nao", postponementReason: null }],
        }) } }] };
      }

      if (userContent.includes("Você é o DIRETOR DE AUDIÊNCIA de um simulador")) {
        _state.count++;
        return { choices: [{ message: { content: JSON.stringify({
          action: "fala",
          speakerRole: "promotor",
          targetRole: null,
          content: `Prosseguindo a audiência. [ref:${_state.count}] Solicito que se ouça a testemunha.`,
        }) } }] };
      }

      _state.count++;
      return { choices: [{ message: {
        content: `Excelência, manifesto-me nos autos. [ref:${_state.count}] A prova demonstra a autoria delitiva.`,
      } }] };
    }),
  };
});

function createContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "tribunal-test-user",
    email: "juiz@tribunal.test",
    name: "Dr. Juiz Teste",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

describe("⚖️ Fluxo Tribunal — Integração Completa via tRPC", () => {
  let trialId: number;
  let sessionId: number;

  it("1. Deve gerar caso penal e criar sessão como juiz", async () => {
    const caller = appRouter.createCaller(createContext().ctx);

    const trial: any = await caller.trial.generate({ area: "penal", difficulty: "facil" });
    trialId = trial.id ?? trial.trialId;
    expect(trialId).toBeGreaterThan(0);
    expect(trial.area).toBe("penal");
    expect(trial.admiteJuri).toBe(true);

    const result: any = await caller.session.create({
      trialId,
      userRole: "juiz",
      userName: "Dr. Juiz Teste",
    });
    sessionId = typeof result === "number" ? result : result.id ?? result.sessionId;
    expect(sessionId).toBeGreaterThan(0);
  }, 20000);

  it("2. Deve criar participantes de 1ª instância com o usuário como juiz", async () => {
    const db = await import("./db");
    const participants = await db.getSessionParticipants(sessionId);
    const roles = participants.map((p: any) => p.role);

    expect(roles).toContain("juiz");
    expect(roles).toContain("promotor");
    expect(roles).toContain("advogado_defesa");
    expect(roles).toContain("testemunha");
    expect(roles).toContain("perito");
    expect(participants.some((p: any) => p.isUser && p.role === "juiz")).toBe(true);
    expect(participants.some((p: any) => p.name === "Dr. Juiz Teste")).toBe(true);
  }, 10000);

  it("3. Deve enviar mensagem como juiz e continuar a audiência", async () => {
    const caller = appRouter.createCaller(createContext().ctx);

    const sent: any = await caller.message.send({
      sessionId,
      content: "Vamos ouvir a testemunha sobre os fatos ocorridos na praça central.",
    });
    expect(sent.content).toBeTruthy();
    expect(sent.role).toBeTruthy();

    const continued: any = await caller.message.continuar({ sessionId });
    expect(continued).toBeDefined();
    if (!continued.waitingForUser) expect(String(continued.content).length).toBeGreaterThan(10);
  }, 20000);

  it("4. Histórico deve conter falas do usuário e da IA", async () => {
    const db = await import("./db");
    const messages = await db.getSessionMessages(sessionId);
    const reais = messages.filter((m: any) => m.role !== "sistema");

    expect(reais.length).toBeGreaterThanOrEqual(2);
    expect(reais.some((m: any) => m.isAI === false && m.role === "juiz")).toBe(true);
    expect(reais.some((m: any) => m.isAI === true)).toBe(true);
  }, 10000);

  it("4.1. Deve registrar origem da prova e confronto nos autos e na audiência", async () => {
    const db = await import("./db");
    const evidences = await db.getTrialEvidences(trialId);
    expect(evidences.length).toBeGreaterThan(0);
    expect(evidences[0].origem).toBe("IML");
    expect(evidences[0].custodia).toContain("sem quebra de lacre");

    const caller = appRouter.createCaller(createContext().ctx);
    const atualizada: any = await caller.evidence.confrontar({
      evidenceId: evidences[0].id,
      sessionId,
      texto: "O laudo registra horário diverso do depoimento da testemunha.",
    });

    expect(atualizada.confrontacoes).toHaveLength(1);
    const messages = await db.getSessionMessages(sessionId);
    expect(messages.some((m: any) => String(m.content).includes("CONFRONTO DE PROVA"))).toBe(true);
  }, 10000);

  it("5. Deve proferir sentença final e registrar no status da sessão", async () => {
    const caller = appRouter.createCaller(createContext().ctx);

    const decision: any = await caller.session.generateFinalDecision({ sessionId });
    expect(decision.veredicto).toBe("culpado");
    expect(decision.sentencaFundamentada).toContain("DISPOSITIVO");
    expect(decision.relatorio).toContain("denunciou");
    expect(decision.dispositivo).toContain("Julgo procedente");
    expect(decision.dosimetria.regime).toBe("Semiaberto");

    const db = await import("./db");
    const session = await db.getSessionById(sessionId);
    expect(session?.decisionDetails).toBeTruthy();
    expect(session?.decisionDetails).toContain("culpado");
    expect(session?.status).toBe("sentenciado");
  }, 15000);
});
