/**
 * Higienização das falas geradas pela IA.
 *
 * Modelos que também atuam como agentes às vezes "vazam" artefatos do
 * harness (checkpoints, status de ferramentas, próximos passos) no meio da
 * resposta. No simulador isso quebra a imersão e pode até parecer uma
 * mensagem do sistema. Esta função remove esses blocos e, se sobrar apenas
 * metadados, devolve uma fala neutra em vez de salvar o lixo no histórico.
 */

export const ANTI_META_INSTRUCTION = [
  "NUNCA escreva resumos, status de execução, checkpoints, metadados, 'próximos passos', 'tarefas concluídas', 'ferramentas desabilitadas', 'working directory', 'próximo prompt do usuário' ou qualquer texto fora da fala do personagem.",
  "Também são proibidos os equivalentes em inglês: 'maximum steps limit reached', 'max steps', 'step limit', 'tool calls disabled', 'next user prompt', 'system status' e 'conversation checkpoint'.",
  "Não mencione IA, agente, sistema, prompt, ferramentas ou instruções recebidas.",
  "Sua resposta deve conter APENAS a fala, em primeira pessoa, como em uma sessão real.",
].join(" ");

export const PORTUGUESE_ONLY_INSTRUCTION =
  "Escreva APENAS em português, usando exclusivamente caracteres latinos (com acentos). Nunca misture caracteres chineses, japoneses, coreanos, cirílicos, árabes ou de qualquer outro alfabeto, nem tokens soltos em outros idiomas.";

// CJK, Hiragana/Katakana, Hangul, Cirílico, Hebraico, Árabe, Tailândes e
// formulários fullwidth. Latim (incluindo acentos) é permitido.
const FOREIGN_SCRIPT_PATTERN =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0e00-\u0e7f\uff01-\uff60]/;

/** Detecta respostas em que o modelo misturou outro alfabeto no português. */
export function hasForeignScript(text: string): boolean {
  return FOREIGN_SCRIPT_PATTERN.test(text);
}

/** Remove apenas os caracteres de outro alfabeto e normaliza os espaços. */
export function stripForeignScript(text: string): string {
  return text
    .replace(new RegExp(FOREIGN_SCRIPT_PATTERN.source, "gu"), " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

// Alguns modelos repetem o rótulo do personagem dentro do próprio texto
// ("Ministra Fulana [Ministro do STF](IA)"). A interface já mostra quem fala.
const ROLE_LABEL_PATTERN = /^\s*[^:\n]+\[[^\]]+\]\s*\(IA\)\s*$/i;

const META_BLOCK_PATTERN = new RegExp(
  [
    "<conversation-checkpoint",
    "M[ÁA]XIMOS?\\s+PASSOS?",
    "FERRAMENTAS\\s+DESABILITADAS",
    "FERRAMENTAS\\s+DESATIVADAS",
    "TOOLS?\\s+DISABLED",
    "TOOL\\s+CALLS?\\s+DISABLED",
    "MAXIMUM\\s+STEPS?\\s+LIMIT\\s+REACHED",
    "MAX\\s+STEPS?\\s+LIMIT\\s+REACHED",
    "STEPS?\\s+LIMIT\\s+REACHED",
    "MAXIMUM\\s+STEPS?\\b",
    "CONVERSATION[\\s-]+CHECKPOINT",
    "NEXT\\s+USER\\s+PROMPT",
    "SYSTEM\\s+STATUS",
    "PR[ÓO]XIMO\\s+PROMPT\\s+DO\\s+USU[ÁA]RIO",
    "PR[ÓO]XIMA\\s+ENTRADA\\s+DO\\s+USU[ÁA]RIO",
    "PR[ÓO]XIMA\\s+A[ÇC][ÃA]O\\s+DO\\s+USU[ÁA]RIO",
    "RESUMO\\s+DO\\s+TRABALHO\\s+REALIZADO",
    "TAREFAS\\s+N[ÃA]O\\s+CONCLU[ÍI]DAS",
    "RECOMENDA[ÇC][ÕO]ES\\s+PARA",
    "STATUS\\s+DO\\s+SISTEMA",
    "WORKING\\s+DIRECTORY",
    "PR[ÓO]XIMA\\s+A[ÇC][ÃA]O\\s*:",
  ].join("|"),
  "i",
);

const NEUTRAL_FALLBACK =
  "Peço vênia, Excelência, para prosseguir na apreciação do feito.";

export function sanitizeAIResponse(
  aiContent: string,
  userRole: string,
  userParticipantName: string,
): string {
  let content = aiContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Tags de contexto injetadas pelo harness também podem vazar na resposta.
  for (const tag of ["conversation-checkpoint", "system-reminder", "skill_content"]) {
    content = content
      .replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), "")
      .replace(new RegExp(`<\\/?${tag}[^>]*>`, "gi"), "")
      .trim();
  }

  if (hasForeignScript(content)) {
    console.log("[AVISO] IA misturou caracteres de outro alfabeto; removendo.");
    content = stripForeignScript(content);
  }

  const labelLines = content.split("\n").filter(line => ROLE_LABEL_PATTERN.test(line));
  if (labelLines.length) {
    console.log("[AVISO] IA repetiu o rótulo do personagem; removendo.");
    content = content
      .split("\n")
      .filter(line => !ROLE_LABEL_PATTERN.test(line))
      .join("\n")
      .trim();
  }

  const multipleRolesPattern =
    /^\s*(Juiz|Promotor|Advogado|Defensor|Testemunha|Perito|Jurado|Réu|Vítima)\s*:/gim;
  const lines = content.split("\n");
  const roleLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(multipleRolesPattern)) {
      roleLines.push(i);
    }
  }

  if (roleLines.length > 1) {
    console.log(
      `[AVISO] IA tentou incluir falas de múltiplos personagens. Cortando a partir da linha ${roleLines[1]}...`,
    );
    const cutLines = lines.slice(0, roleLines[1]);

    if (roleLines[0] === 0) {
      const firstLine = lines[0];
      const colonIndex = firstLine.indexOf(":");
      if (colonIndex > 0) {
        cutLines[0] = firstLine.substring(colonIndex + 1).trim();
      }
    }
    content = cutLines.join("\n").trim();
  }

  const userRoleMentions =
    userRole === "ministro"
      ? [userParticipantName]
      : [userRole, userRole.replace("_", " "), userParticipantName];

  const mentionsUserRole = userRoleMentions.some(mention =>
    content.toLowerCase().includes(mention.toLowerCase() + ":"),
  );

  if (mentionsUserRole) {
    console.log("[AVISO] IA incluiu prefixo do usuário. Higienizando mensagem...");
    for (const mention of userRoleMentions) {
      content = content.replace(
        new RegExp(`^\\s*${mention}\\s*:[\\s\\S]*$`, "gim"),
        "",
      ).trim();
    }
  }

  // Artefatos de agente aparecem no fim da resposta. Cortamos a partir do
  // primeiro marcador para preservar eventual fala válida antes dele.
  const metaMatch = META_BLOCK_PATTERN.exec(content);
  if (metaMatch) {
    console.log("[AVISO] IA gerou metadados de agente; removendo bloco técnico.");
    content = content.slice(0, metaMatch.index).trim();
  }

  // Remove linhas soltas que ainda cheiraram a status/ferramentas.
  content = content
    .split("\n")
    .filter(line => !META_BLOCK_PATTERN.test(line))
    .join("\n")
    .trim();

  if (!content) {
    console.log(
      "[AVISO] A resposta da IA continha apenas metadados; usando fala neutra.",
    );
    return NEUTRAL_FALLBACK;
  }

  return content;
}
