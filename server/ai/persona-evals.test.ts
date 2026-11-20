import { describe, expect, it } from "vitest";
import {
  ANTI_META_INSTRUCTION,
  hasForeignScript,
  PORTUGUESE_ONLY_INSTRUCTION,
  sanitizeAIResponse,
} from "./speech-sanitizer";

const personas = [
  {
    role: "juiz",
    name: "Juiz (Você)",
    fala: "Determino que se prossiga com a instrução, independentemente da insistência da defesa.",
    marca: /^Determino/,
  },
  {
    role: "promotor",
    name: "Dr. Paulo Souza",
    fala: "Requeiro, Excelência, a oitiva da testemunha antes dos debates.",
    marca: /^Requeiro/,
  },
  {
    role: "advogado_defesa",
    name: "Dra. Fernanda Lima",
    fala: "Insisto, Excelência, que a prova foi colhida sem contraditório.",
    marca: /^Insisto/,
  },
  {
    role: "ministro",
    name: "Ministro Relator",
    fala: "Senhor Presidente, voto pela improcedência da ação.",
    marca: /^Senhor Presidente/,
  },
  {
    role: "testemunha",
    name: "Maria da Silva",
    fala: "Eu vi o veículo parar em frente à portaria às dezoito horas.",
    marca: /^Eu vi/,
  },
];

const ARTEFATO =
  "\n\nMAXIMUM STEPS LIMIT REACHED -\n<conversation-checkpoint>ok</conversation-checkpoint>\n城里";

describe("avaliações de persona", () => {
  it("mantém as instruções de primeira pessoa, português e anti-meta", () => {
    expect(ANTI_META_INSTRUCTION).toMatch(/primeira pessoa/i);
    expect(ANTI_META_INSTRUCTION).toMatch(/APENAS a fala/i);
    expect(PORTUGUESE_ONLY_INSTRUCTION).toMatch(/APENAS em português/i);
    expect(PORTUGUESE_ONLY_INSTRUCTION).toMatch(/caracteres latinos/i);
  });

  it.each(personas)("preserva a fala de $role sem artefatos", (persona) => {
    expect(persona.fala).toMatch(persona.marca);
    expect(hasForeignScript(persona.fala)).toBe(false);
    expect(sanitizeAIResponse(persona.fala, persona.role, persona.name)).toBe(persona.fala);
  });

  it.each(personas)("remove metadados e caracteres estrangeiros da fala de $role", (persona) => {
    const resultado = sanitizeAIResponse(
      `${persona.fala}${ARTEFATO}`,
      persona.role,
      persona.name,
    );

    expect(resultado).toBe(persona.fala);
    expect(resultado).not.toMatch(/MAXIMUM|STEPS|checkpoint|城里/i);
    expect(hasForeignScript(resultado)).toBe(false);
  });
});
