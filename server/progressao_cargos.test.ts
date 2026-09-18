import { describe, expect, it } from "vitest";

describe("Progressão de Cargos nas Instâncias", () => {
  // Função auxiliar que simula a lógica de progressão
  const getProximoCargo = (cargoAtual: string, instanciaDestino: "segunda" | "terceira"): string => {
    if (instanciaDestino === "segunda") {
      // 1ª → 2ª instância
      const mapa: Record<string, string> = {
        "juiz": "desembargador",
        "promotor": "procurador_justica",
        "advogado_defesa": "advogado_defesa",
        "defensor_publico": "defensor_publico",
      };
      return mapa[cargoAtual] || cargoAtual;
    } else {
      // 2ª → 3ª instância
      const mapa: Record<string, string> = {
        "desembargador": "ministro",
        "procurador_justica": "subprocurador_geral",
        "advogado_defesa": "advogado_defesa",
        "defensor_publico": "defensor_publico",
      };
      return mapa[cargoAtual] || cargoAtual;
    }
  };

  describe("Progressão 1ª → 2ª Instância", () => {
    it("juiz deve virar desembargador", () => {
      expect(getProximoCargo("juiz", "segunda")).toBe("desembargador");
    });

    it("promotor deve virar procurador de justiça", () => {
      expect(getProximoCargo("promotor", "segunda")).toBe("procurador_justica");
    });

    it("advogado de defesa deve permanecer advogado de defesa", () => {
      expect(getProximoCargo("advogado_defesa", "segunda")).toBe("advogado_defesa");
    });

    it("defensor público deve permanecer defensor público", () => {
      expect(getProximoCargo("defensor_publico", "segunda")).toBe("defensor_publico");
    });
  });

  describe("Progressão 2ª → 3ª Instância", () => {
    it("desembargador deve virar ministro", () => {
      expect(getProximoCargo("desembargador", "terceira")).toBe("ministro");
    });

    it("procurador de justiça deve virar subprocurador-geral", () => {
      expect(getProximoCargo("procurador_justica", "terceira")).toBe("subprocurador_geral");
    });

    it("advogado de defesa deve permanecer advogado de defesa", () => {
      expect(getProximoCargo("advogado_defesa", "terceira")).toBe("advogado_defesa");
    });

    it("defensor público deve permanecer defensor público", () => {
      expect(getProximoCargo("defensor_publico", "terceira")).toBe("defensor_publico");
    });
  });

  describe("Progressão Completa (1ª → 2ª → 3ª)", () => {
    it("juiz → desembargador → ministro", () => {
      const segunda = getProximoCargo("juiz", "segunda");
      expect(segunda).toBe("desembargador");
      
      const terceira = getProximoCargo(segunda, "terceira");
      expect(terceira).toBe("ministro");
    });

    it("promotor → procurador de justiça → subprocurador-geral", () => {
      const segunda = getProximoCargo("promotor", "segunda");
      expect(segunda).toBe("procurador_justica");
      
      const terceira = getProximoCargo(segunda, "terceira");
      expect(terceira).toBe("subprocurador_geral");
    });

    it("advogado permanece advogado em todas instâncias", () => {
      const segunda = getProximoCargo("advogado_defesa", "segunda");
      expect(segunda).toBe("advogado_defesa");
      
      const terceira = getProximoCargo(segunda, "terceira");
      expect(terceira).toBe("advogado_defesa");
    });
  });
});
