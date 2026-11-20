import { describe, expect, it } from "vitest";
import {
  buildHearingDirectorPrompt,
  parseHearingDirectorDecision,
} from "./hearing-director";

describe("liberdade cênica do Diretor de Audiência", () => {
  it("aceita ações espontâneas sem convertê-las em fala genérica", () => {
    for (const action of ["aparte", "repreensao", "revelacao"] as const) {
      const decision = parseHearingDirectorDecision(
        JSON.stringify({
          action,
          speakerRole: "juiz",
          targetRole: "advogado_defesa",
          content: "Acontecimento plausível.",
        }),
      );

      expect(decision.action).toBe(action);
    }
  });

  it("instrui o modelo a permitir fala fora da vez e repreensão não automática", () => {
    const prompt = buildHearingDirectorPrompt({
      trial: { title: "Caso", area: "penal" },
      participants: [],
      messages: [],
      evidences: [],
      userRole: "juiz",
      userName: "Dr. João",
    });

    const flat = prompt.replace(/\s+/g, " ");

    expect(flat).toContain("Não existe vez obrigatória");
    expect(flat).toContain("livre arbítrio");
    expect(flat).toContain("chame a atenção");
    expect(flat).toContain("Uma repreensão não é automática");
    expect(flat).toContain('"revelacao"');
    expect(flat).toContain('"aparte"');
  });

  it("não entrega a verdade objetiva nem conhecimentos privados ao Diretor", () => {
    const prompt = buildHearingDirectorPrompt({
      trial: {
        title: "Caso",
        area: "penal",
        facts: {
          publicNarrative: "Versão pública dos fatos.",
          objectiveTruth: "SEGREDO ABSOLUTO",
          knownFacts: [
            {
              role: "réu",
              person: "Ricardo",
              facts: "SEGREDO VIVIDO",
              interest: "SEGREDO INTERESSE",
              fear: "SEGREDO MEDO",
            },
          ],
        },
      },
      participants: [],
      messages: [],
      evidences: [],
      userRole: "juiz",
      userName: "Dr. João",
    });

    expect(prompt).toContain("Versão pública dos fatos.");
    expect(prompt).not.toContain("SEGREDO");
    expect(prompt.replace(/\s+/g, " ")).toContain("NÃO tem acesso à verdade objetiva");
  });
});
