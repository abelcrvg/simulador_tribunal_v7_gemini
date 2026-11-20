/**
 * Regras do Plenário do STF usadas pelo simulador.
 *
 * O banco de participantes não tem coluna de cargo, então a função
 * institucional é gravada como uma tag no início de `description`:
 * [PRESIDENTE], [VICE-PRESIDENTE], [RELATOR] ou [VOGAL].
 * Nunca se basear apenas no nome — "Presidenta" e nomes fictícios quebrariam
 * a detecção.
 */

export type STFOffice = "presidente" | "vice-presidente" | "relator" | "vogal";

export const STF_TAGS: Record<STFOffice, string> = {
  presidente: "[PRESIDENTE]",
  "vice-presidente": "[VICE-PRESIDENTE]",
  relator: "[RELATOR]",
  vogal: "[VOGAL]",
};

export function stfOfficeOf(participant: {
  description?: string | null;
  name?: string | null;
}): STFOffice | null {
  const description = participant.description || "";
  for (const office of Object.keys(STF_TAGS) as STFOffice[]) {
    if (description.includes(STF_TAGS[office])) return office;
  }
  return null;
}

export function findSTFOffice<T extends { isUser?: boolean | null }>(
  participants: T[],
  office: STFOffice,
  includeUser = false,
): T | undefined {
  return participants.find(
    p => (includeUser || !p.isUser) && stfOfficeOf(p as any) === office,
  );
}

/** Nomes fictícios usados para completar as 10 cadeiras de IA quando o modelo
 * devolve menos participantes do que o solicitado. Nenhum é nome de ministro real. */
export const STF_FALLBACK_MINISTERS: Array<{
  office: STFOffice;
  name: string;
  description: string;
  personality: string;
}> = [
  { office: "presidente", name: "Ministro Aureliano Bastos", description: "[PRESIDENTE] Presidente do Supremo Tribunal Federal. Conduz a sessão, concede apartes e proclama o resultado.", personality: "Solenne, imparcial e rigoroso no regimento." },
  { office: "vice-presidente", name: "Ministra Heloísa Camargo", description: "[VICE-PRESIDENTE] Vice-Presidente do Supremo Tribunal Federal. Substitui a presidência e integra o Plenário.", personality: "Serena, precisa e atenta à coerência dos votos." },
  { office: "vogal", name: "Ministro Rafael Nogueira", description: "[VOGAL] Vogal do Plenário. Constitucionalista estrito, ênfase nas garantias fundamentais.", personality: "Técnico, fiel à literalidade da CF/88." },
  { office: "vogal", name: "Ministra Beatriz Alencar", description: "[VOGAL] Vogal do Plenário. Perfil garantista, proteção da dignidade humana.", personality: "Erudita, fluida, inclinada à interpretação evolutiva." },
  { office: "vogal", name: "Ministro Otávio Ribeiro", description: "[VOGAL] Vogal do Plenário. Consequencialista, atento à estabilidade institucional.", personality: "Pragmático, citando precedentes e impacto sistêmico." },
  { office: "vogal", name: "Ministra Clara Villela", description: "[VOGAL] Vogal do Plenário. Especialista em direito público e federalismo.", personality: "Analítica, discreta, firme na separação de poderes." },
  { office: "vogal", name: "Ministro Sérgio Portela", description: "[VOGAL] Vogal do Plenário. Ênfase na proporcionalidade e na razoabilidade.", personality: "Metódico, costuma propor modulação de efeitos." },
  { office: "vogal", name: "Ministra Luísa Andrade", description: "[VOGAL] Vogal do Plenário. Experiência em jurisdição constitucional e direitos sociais.", personality: "Empática, argumenta com princípios constitucionais." },
  { office: "vogal", name: "Ministro Henrique Salgado", description: "[VOGAL] Vogal do Plenário. Defesa da segurança jurídica e da autoridade das decisões.", personality: "Conservador no método, respeitador do stare decisis." },
  { office: "vogal", name: "Ministra Marta Coimbra", description: "[VOGAL] Vogal do Plenário. Foco em controle de constitucionalidade e súmulas vinculantes.", personality: "Precisa, objetiva, gosta de fixar teses." },
];

export const STF_MINISTERS_IA = STF_FALLBACK_MINISTERS.length; // 10
export const STF_TOTAL_SEATS = STF_MINISTERS_IA + 1; // 10 IA + usuário = 11
export const STF_MAJORITY = Math.floor(STF_TOTAL_SEATS / 2) + 1; // 6

export type STFPosition = "procedente" | "improcedente" | "parcial" | "indefinido";

export type STFVote = {
  ministerName: string;
  isUser: boolean;
  position: STFPosition;
  origin: "voto" | "divergencia" | "inferido";
  excerpt: string;
  office?: STFOffice | null;
  tese?: string | null;
  vista?: boolean;
  divergencia?: boolean;
  messageId?: number;
};

const PROCEDENTE_PATTERN = /\bprocedênc|\bprocedent|inconstitucional|\bacolh|\bdefer|\banul|\bderrub|\bviol(i|a|ou|ando)?\s+\S*\s+constitucional/i;
const IMPROCEDENTE_PATTERN = /\bimprocedênc|\bimprocedent|\bconstitucional(?!idade)|\brejeit|\bindefer|\bmanter|\bpreserv|\bvalidez|\bconforme\s+à\s+constitui/i;
// "Modulação de efeitos" NÃO é sinônimo de procedência parcial: um voto pode
// ser integralmente procedente e ainda propor modulação. Só marque parcial
// quando o próprio dispositivo disser isso.
const PARCIAL_PATTERN = /parcialmente\s+procedente|proced(?:ência|ente)\s+em\s+parte|julgo\s+parcial|acolho\s+em\s+parte/i;

function inferPosition(text: string): STFPosition {
  if (PARCIAL_PATTERN.test(text)) return "parcial";
  const pro = PROCEDENTE_PATTERN.test(text);
  const imp = IMPROCEDENTE_PATTERN.test(text);
  if (pro && !imp) return "procedente";
  if (imp && !pro) return "improcedente";
  if (pro && imp) {
    // "inconstitucional" vence "constitucional" quando ambos aparecem.
    return /inconstitucional|\bprocedent|\bacolh/i.test(text)
      ? "procedente"
      : "improcedente";
  }
  return "indefinido";
}

const VISTA_PATTERN = /\bpe(?:ç|c)o\s+vista|\bvista\s+dos\s+autos\b/i;
const TESE_PATTERN = /(?:\[\s*TESE\s*\]|\btese\s*:\s*)([^\n]+)/i;

export function createSTFVoteFromSpeech(params: {
  speech: string;
  participant: { name?: string | null; description?: string | null; isUser?: boolean | null };
  messageId?: number;
}): STFVote | null {
  const content = String(params.speech || "");
  const hasVoteMarker = /\[\s*VOTO\s*\]|^\s*voto\s*:/i.test(content);
  const hasDivergence = /\[\s*DIVERGÊNCIA\s*\]|\[\s*DIVERGENCIA\s*\]/i.test(content);
  const vista = VISTA_PATTERN.test(content);
  const position = inferPosition(content);

  if (!hasVoteMarker && !hasDivergence && !vista && position === "indefinido") {
    return null;
  }

  const teseMatch = content.match(TESE_PATTERN);

  return {
    ministerName: String(params.participant.name || "").trim() || "Ministro",
    isUser: Boolean(params.participant.isUser),
    position,
    origin: hasDivergence ? "divergencia" : hasVoteMarker ? "voto" : "inferido",
    excerpt: content.slice(0, 240),
    office: stfOfficeOf(params.participant),
    tese: teseMatch ? teseMatch[1].trim().slice(0, 300) : null,
    vista,
    divergencia: hasDivergence,
    messageId: params.messageId,
  };
}

export function mergeSTFVotes(
  structured: STFVote[],
  inferred: STFVote[],
): STFVote[] {
  const merged = [...structured];
  const known = new Set(structured.map(v => v.ministerName));
  for (const vote of inferred) {
    if (!known.has(vote.ministerName)) {
      merged.push(vote);
      known.add(vote.ministerName);
    }
  }
  return merged;
}

/**
 * Apura os votos a partir das falas dos ministros. Marcadores explícitos
 * ([VOTO], [DIVERGÊNCIA]) têm prioridade; na falta deles, infere pela linguagem.
 */
export function collectSTFVotes(
  messages: Array<{ role?: string; content?: string | null; isAI?: boolean | null; senderName?: string | null }>,
  participants: Array<{ name?: string; isUser?: boolean | null; role?: string }>,
  structuredVotes: STFVote[] = [],
): STFVote[] {
  const ministers = participants.filter(p => p.role === "ministro");
  const votes: STFVote[] = [];
  const seen = new Set<string>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "ministro" || !message.content) continue;

    const name = String(message.senderName || "").trim();
    if (!name || seen.has(name)) continue;
    const participant = ministers.find(p => p.name === name);
    // Só conta a fala de quem é ministro da sessão (ele próprio ou a IA).
    if (!participant) continue;

    const content = String(message.content);
    const hasVoteMarker = /\[\s*VOTO\s*\]|^\s*voto\s*:/i.test(content);
    const hasDivergence = /\[\s*DIVERGÊNCIA\s*\]|\[\s*DIVERGENCIA\s*\]/i.test(content);
    if (!hasVoteMarker && !hasDivergence) continue;

    seen.add(name);
    votes.push({
      ministerName: name,
      isUser: Boolean(participant.isUser),
      position: inferPosition(content),
      origin: hasDivergence ? "divergencia" : "voto",
      excerpt: content.slice(0, 240),
    });
  }

  // Votos inferidos para ministros que ainda não usaram marcador, mas já
  // manifestaram posição clara em fala recente.
  for (const participant of ministers) {
    if (seen.has(participant.name || "")) continue;
    const relevant = [...messages]
      .reverse()
      .filter(m => m.role === "ministro" && m.senderName === participant.name && m.content)
      .slice(0, 2)
      .map(m => String(m.content))
      .join(" ");
    if (!relevant) continue;
    const position = inferPosition(relevant);
    if (position === "indefinido") continue;
    seen.add(participant.name || "");
    votes.push({
      ministerName: participant.name || "Ministro",
      isUser: Boolean(participant.isUser),
      position,
      origin: "inferido",
      excerpt: relevant.slice(0, 240),
    });
  }

  return mergeSTFVotes(structuredVotes, votes);
}

export function tallySTFVotes(votes: STFVote[]) {
  const tally = {
    total: votes.length,
    procedente: votes.filter(v => v.position === "procedente").length,
    improcedente: votes.filter(v => v.position === "improcedente").length,
    parcial: votes.filter(v => v.position === "parcial").length,
    indefinido: votes.filter(v => v.position === "indefinido").length,
    majorityReached: false,
    winningPosition: "indefinido" as STFPosition,
  };
  const max = Math.max(tally.procedente, tally.improcedente, tally.parcial);
  if (max > 0 && max >= STF_MAJORITY) {
    tally.majorityReached = true;
    tally.winningPosition =
      tally.procedente === max
        ? "procedente"
        : tally.improcedente === max
          ? "improcedente"
          : "parcial";
  }
  return tally;
}
