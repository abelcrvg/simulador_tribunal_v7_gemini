export interface KnownFactSlice {
  role?: string;
  person?: string;
  facts: string;
  interest?: string;
  fear?: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function norm(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterKnowledge(participant: any, trialFacts: any): string {
  const facts = trialFacts && typeof trialFacts === "object" ? trialFacts : {};
  const publicNarrative = text(facts.publicNarrative) || text(trialFacts);
  const slices: KnownFactSlice[] = Array.isArray(facts.knownFacts)
    ? facts.knownFacts
    : [];

  const role = norm(participant?.role);
  const name = norm(participant?.name);

  const slice =
    slices.find(s => norm(s.person) === name && norm(s.person) !== "") ||
    slices.find(s => norm(s.role) === role && norm(s.role) !== "");

  const base = `[NARRATIVA PÚBLICA / DENÚNCIA]: ${publicNarrative || "Não informada."}`;

  if (!slice) {
    return `${base}\n\n[O QUE VOCÊ SABE]: Limite-se à narrativa pública e ao que foi dito nesta audiência.`;
  }

  return [
    base,
    `[O QUE VOCÊ VIVEU]: ${text(slice.facts)}`,
    slice.interest ? `[SEU INTERESSE]: ${text(slice.interest)}` : null,
    slice.fear ? `[SEU MEDO]: ${text(slice.fear)}` : null,
    "[REGRA]: Você sabe apenas o que viveu e o que ouviu aqui. Saber a verdade não obriga você a confessar: proteja seu interesse, omita ou minta se houver motivo.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
