import { describe, expect, it } from "vitest";
import { sanitizeAIResponse } from "./speech-sanitizer";

describe("sanitizeAIResponse", () => {
  it("preserva a fala normal do personagem", () => {
    const text = "Excelência, votei pela improcedência da ação.";
    expect(sanitizeAIResponse(text, "ministro", "Ministro (Você)")).toBe(text);
  });

  it("corta o bloco técnico de agente colado no fim da fala", () => {
    const text = [
      "Senhor Presidente, acompanho o relator.",
      "",
      "MÁXIMOS PASSOS PARA ESTA AGENTE CONCLUÍDOS.",
      "FERRAMENTAS DESABILITADAS ATÉ PRÓXIMA ENTRADA DO USUÁRIO.",
      "=== STATUS DO SISTEMA ===",
    ].join("\n");

    expect(sanitizeAIResponse(text, "ministro", "Ministro (Você)")).toBe(
      "Senhor Presidente, acompanho o relator.",
    );
  });

  it("substitui por fala neutra quando a IA só gera metadados", () => {
    const text = [
      "MÁXIMOS PASSOS PARA ESTA AGENTE CONCLUÍDOS.",
      "RESUMO DO TRABALHO REALIZADO",
      "PRÓXIMO PROMPT DO USUÁRIO DEVERÁ ...",
    ].join("\n");

    const result = sanitizeAIResponse(text, "ministro", "Ministro (Você)");
    expect(result).toMatch(/Peço vênia/);
    expect(result).not.toMatch(/PASSOS|RESUMO|PRÓXIMO PROMPT/i);
  });

  it("remove checkpoint e tags de pensamento", () => {
    const text = "<think>vou responder</think><conversation-checkpoint>\nresumo interno\n</conversation-checkpoint>\nVoto pela procedência.";
    const result = sanitizeAIResponse(text, "ministro", "Ministro (Você)");
    expect(result).toContain("Voto pela procedência.");
    expect(result).not.toContain("conversation-checkpoint");
  });

  it("continua cortando falas de múltiplos personagens", () => {
    const text = "Juiz: Silêncio.\nPromotor: Excelência, a acusação.";
    expect(sanitizeAIResponse(text, "juiz", "Dr. Juiz de Direito")).toBe(
      "Silêncio.",
    );
  });
});
