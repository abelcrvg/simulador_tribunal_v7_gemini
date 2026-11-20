import { describe, expect, it } from "vitest";
import { filterKnowledge } from "./knowledge";

const facts = {
  publicNarrative: "Versão pública dos fatos.",
  objectiveTruth: "SEGREDO: foi o réu quem atacou primeiro.",
  knownFacts: [
    {
      role: "réu",
      person: "Ricardo",
      facts: "Eu estava no local, mas fui empurrado antes de qualquer discussão.",
      interest: "Quero ser absolvido.",
      fear: "Que a testemunha diga que eu comecei tudo.",
    },
    {
      role: "testemunha",
      person: "",
      facts: "Vi o réu levantar a mão, mas não vi quem começou.",
      interest: "Proteger meu irmão.",
      fear: "Ser chamada de mentirosa na audiência.",
    },
  ],
};

describe("filterKnowledge", () => {
  it("nunca devolve a verdade objetiva", () => {
    for (const participant of [
      { role: "juiz", name: "Juiz" },
      { role: "réu", name: "Ricardo" },
      { role: "testemunha", name: "Maria" },
      { role: "promotor", name: "Dr. Paulo" },
    ]) {
      expect(filterKnowledge(participant, facts)).not.toContain("SEGREDO");
    }
  });

  it("entrega apenas o que a pessoa viveu, com interesse e medo", () => {
    const result = filterKnowledge({ role: "réu", name: "Ricardo" }, facts);

    expect(result).toContain("Versão pública dos fatos.");
    expect(result).toContain("Eu estava no local, mas fui empurrado");
    expect(result).toContain("Quero ser absolvido.");
    expect(result).toContain("Que a testemunha diga");
    expect(result).toContain("Saber a verdade não obriga você a confessar");
  });

  it("usa o fragmento por papel quando não há nome específico", () => {
    const result = filterKnowledge({ role: "testemunha", name: "Maria" }, facts);

    expect(result).toContain("Vi o réu levantar a mão");
    expect(result).not.toContain("Eu estava no local");
  });

  it("sem fragmento, o personagem só conhece a narrativa pública", () => {
    const result = filterKnowledge({ role: "juiz", name: "Juiz" }, facts);

    expect(result).toContain("Versão pública dos fatos.");
    expect(result).toContain("Limite-se à narrativa pública");
    expect(result).not.toContain("O QUE VOCÊ VIVEU");
  });

  it("trata casos antigos sem knownFacts sem vazar a verdade", () => {
    const result = filterKnowledge(
      { role: "réu", name: "Ricardo" },
      { publicNarrative: " Versão antiga. ", objectiveTruth: "SEGREDO ANTIGO" },
    );

    expect(result).toContain("Versão antiga.");
    expect(result).not.toContain("SEGREDO ANTIGO");
  });
});
