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
});
