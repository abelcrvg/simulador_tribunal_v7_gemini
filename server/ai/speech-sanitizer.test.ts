import { describe, expect, it } from "vitest";
import {
  hasForeignScript,
  PORTUGUESE_ONLY_INSTRUCTION,
  sanitizeAIResponse,
  stripForeignScript,
} from "./speech-sanitizer";

const ROLE = "ministro";
const NAME = "Ministro (Você)";

describe("sanitizeAIResponse", () => {
  it("preserva a fala normal do personagem", () => {
    const text = "Excelência, votei pela improcedência da ação.";
    expect(sanitizeAIResponse(text, ROLE, NAME)).toBe(text);
  });

  it("corta o bloco técnico de agente colado no fim da fala", () => {
    const text = [
      "Senhor Presidente, acompanho o relator.",
      "",
      "MÁXIMOS PASSOS PARA ESTA AGENTE CONCLUÍDOS.",
      "FERRAMENTAS DESABILITADAS ATÉ PRÓXIMA ENTRADA DO USUÁRIO.",
      "=== STATUS DO SISTEMA ===",
    ].join("\n");

    expect(sanitizeAIResponse(text, ROLE, NAME)).toBe(
      "Senhor Presidente, acompanho o relator.",
    );
  });

  it("substitui por fala neutra quando a IA só gera metadados", () => {
    const text = [
      "MÁXIMOS PASSOS PARA ESTA AGENTE CONCLUÍDOS.",
      "RESUMO DO TRABALHO REALIZADO",
      "PRÓXIMO PROMPT DO USUÁRIO DEVERÁ ...",
    ].join("\n");

    const result = sanitizeAIResponse(text, ROLE, NAME);
    expect(result).toMatch(/Peço vênia/);
    expect(result).not.toMatch(/PASSOS|RESUMO|PRÓXIMO PROMPT/i);
  });

  it("remove checkpoint e tags de pensamento", () => {
    const text = "<think>vou responder</think><conversation-checkpoint>\nresumo interno\n</conversation-checkpoint>\nVoto pela procedência.";
    const result = sanitizeAIResponse(text, ROLE, NAME);
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

describe("higienização de caracteres estrangeiros", () => {
  it("detecta CJK e remove os caracteres mantendo o português", () => {
    const text = "aborto城里 não voluntário e 意外的 aborto instantaneouslyGTG有限";
    expect(hasForeignScript(text)).toBe(true);

    const cleaned = stripForeignScript(text);
    expect(hasForeignScript(cleaned)).toBe(false);
    expect(cleaned).toContain("aborto não voluntário");
    expect(cleaned).toContain("aborto");
  });

  it("higieniza caracteres estrangeiros na fala gerada", () => {
    const cleaned = sanitizeAIResponse(
      "A proteção da mulher autoriza a responsabilização? 有限 a ADPF 有限的 pretende?",
      ROLE,
      NAME,
    );
    expect(hasForeignScript(cleaned)).toBe(false);
    expect(cleaned).not.toMatch(/\s+,/);
  });

  it("expõe a instrução de português para os prompts", () => {
    expect(PORTUGUESE_ONLY_INSTRUCTION).toContain("português");
    expect(PORTUGUESE_ONLY_INSTRUCTION).toContain("caracteres latinos");
  });
});
