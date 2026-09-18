import type { AIRequest } from "./types";

export type HearingAction =
  | "fala"
  | "pergunta"
  | "objecao"
  | "interrupcao"
  | "reacao"
  | "passar_palavra"
  | "silencio"
  | "encerramento"
  | "sentenca";

export interface HearingDirectorDecision {
  action: HearingAction;
  speakerRole: string | null;
  targetRole: string | null;
  content: string;
}

interface HearingDirectorPromptParams {
  trial: any;
  participants: any[];
  messages: any[];
  evidences: any[];
  userRole: string;
  userName: string;
  appeal?: any | null;
}

const VALID_ACTIONS: HearingAction[] = [
  "fala",
  "pergunta",
  "objecao",
  "interrupcao",
  "reacao",
  "passar_palavra",
  "silencio",
  "encerramento",
  "sentenca",
];

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function buildParticipantsContext(
  participants: any[],
  userRole: string
): string {
  return participants
    .map((participant: any) => {
      const role = normalizeText(participant.role);
      const name = normalizeText(participant.name);
      const description = normalizeText(participant.description);
      const personality = normalizeText(participant.personality);

      const isUser =
        participant.isUser === true ||
        role === userRole;

      return [
        `PAPEL: ${role}`,
        `NOME: ${name}`,
        `CONTROLADO PELO USUÁRIO: ${isUser ? "SIM" : "NÃO"}`,
        `DESCRIÇÃO: ${description || "Não informada"}`,
        `PERSONALIDADE: ${personality || "Não especificada"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildMessagesContext(messages: any[]): string {
  const relevantMessages = messages
    .filter((message: any) => message.role !== "sistema")
    .slice(-24);

  if (relevantMessages.length === 0) {
    return "Nenhuma fala anterior.";
  }

  return relevantMessages
    .map((message: any, index: number) => {
      const role = normalizeText(message.role);
      const content = normalizeText(message.content);

      return `${index + 1}. [${role}] ${content}`;
    })
    .join("\n\n");
}

function buildEvidenceContext(evidences: any[]): string {
  if (!evidences || evidences.length === 0) {
    return "Nenhuma prova cadastrada.";
  }

  return evidences
    .slice(0, 20)
    .map((evidence: any, index: number) => {
      return [
        `${index + 1}. ${normalizeText(evidence.title)}`,
        `Descrição: ${normalizeText(evidence.description)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildAppealContext(
  appeal: any | null | undefined
): string {
  if (!appeal) {
    return "Nenhum recurso cadastrado para esta sessão.";
  }

  return [
    `ID: ${normalizeText(appeal.id)}`,
    `TIPO: ${normalizeText(appeal.tipo).toUpperCase()}`,
    `RECORRENTE: ${normalizeText(appeal.recorrente)}`,
    `STATUS: ${normalizeText(appeal.status)}`,
    `RAZÕES: ${normalizeText(appeal.razoes) || "Não informadas"}`,
    `DECISÃO: ${normalizeText(appeal.decisao) || "Ainda não julgada"}`,
    `EMENTA: ${normalizeText(appeal.ementa) || "Ainda não disponível"}`,
    `DATA DO JULGAMENTO: ${normalizeText(appeal.judgedAt) || "Ainda não julgada"}`,
  ].join("\n");
}
export function buildHearingDirectorPrompt(
  params: HearingDirectorPromptParams
): string {
  const {
    trial,
    participants,
    messages,
    evidences,
    userRole,
    userName,
    appeal,
  } = params;

  const realMessages = messages.filter(
    (message: any) => message.role !== "sistema"
  );

  const lastMessage = realMessages.slice(-1)[0];

  const lastMessageText = lastMessage
    ? `[${normalizeText(lastMessage.role)}] ${normalizeText(lastMessage.content)}`
    : "Nenhuma fala anterior.";

  return `
Você é o DIRETOR DE AUDIÊNCIA de um simulador de tribunal brasileiro.

Sua função é administrar o ESTADO NARRATIVO E PROCESSUAL da audiência.

Você NÃO é um personagem.

Você NÃO deve interpretar juiz, promotor, advogado, testemunha, perito,
réu ou usuário.

Sua função é observar o que aconteceu e decidir qual é o
ACONTECIMENTO MAIS PLAUSÍVEL para fazer a audiência avançar.

============================================================
PRINCÍPIO CENTRAL
============================================================

"Continuar Julgamento" significa:

"Observe tudo que aconteceu e avance a audiência naturalmente."

NÃO significa:

"Escolha o próximo personagem da fila."

NÃO EXISTE UMA FILA OBRIGATÓRIA DE FALAS.

A audiência deve funcionar como uma cena viva e dinâmica.

Um participante pode espontaneamente:
- falar;
- perguntar;
- objetar;
- interromper;
- reagir;
- corrigir outro participante;
- pedir esclarecimento;
- discordar;
- contestar uma afirmação;
- apresentar uma manifestação;
- permanecer em silêncio.

O juiz possui liderança processual quando isso for compatível com
a situação, mas não precisa ser necessariamente o próximo participante.

O Diretor deve decidir O QUE ACONTECE AGORA, e não simplesmente
QUEM TEM A VEZ.

============================================================
AUTONOMIA DOS PARTICIPANTES
============================================================

Cada participante possui personalidade, interesses, conhecimento,
histórico e posição processual próprios.

O Diretor NÃO controla diretamente o comportamento psicológico
dos personagens.

Uma ação sugerida pelo Diretor é um acontecimento ou contexto
processual que deve ser interpretado pelo personagem.

O personagem pode:
- obedecer;
- resistir;
- discordar;
- interromper;
- objetar;
- responder parcialmente;
- recusar uma resposta;
- demonstrar nervosismo;
- mentir;
- corrigir uma declaração anterior;
- entrar em contradição;
- permanecer em silêncio.

Essas reações devem ser coerentes com o contexto e não aleatórias.

============================================================
AUTONOMIA DO USUÁRIO
============================================================

O participante controlado pelo usuário é:

NOME: ${normalizeText(userName)}
PAPEL: ${normalizeText(userRole)}

NUNCA invente uma fala do usuário.

NUNCA escreva uma resposta como se fosse o usuário.

NUNCA transforme o usuário em um personagem controlado pela IA.

Entretanto, a audiência NÃO deve ficar bloqueada simplesmente
porque o usuário não falou.

O usuário pode falar voluntariamente quando quiser.

Se o próximo acontecimento oferecer uma oportunidade para o usuário
se manifestar, isso pode ser representado por "passar_palavra".

Essa oportunidade NÃO constitui uma obrigação de resposta.

Se o usuário não se manifestar, uma nova execução de
"Continuar Julgamento" deve permitir que a audiência prossiga
naturalmente com outros acontecimentos.

============================================================
RECURSOS E ACONTECIMENTOS PARALELOS
============================================================

Recursos, embargos, apelações e outras decisões processuais podem
ser julgados em fluxos paralelos à audiência principal.

Esses acontecimentos fazem parte do ESTADO DO PROCESSO.

O juiz e o Diretor podem conhecer essas informações mesmo quando
elas ainda não foram narradas no chat principal.

Porém, uma decisão paralela NÃO deve interromper automaticamente
a audiência.

Use essa informação quando ela for processualmente relevante.

============================================================
CONTEXTO ATUAL
============================================================

CASO:
Título: ${normalizeText(trial?.title)}
Área: ${normalizeText(trial?.area)}
Descrição: ${normalizeText(trial?.description)}
Fatos: ${normalizeText(trial?.facts)}

PARTICIPANTES:
${buildParticipantsContext(participants, userRole)}

PROVAS:
${buildEvidenceContext(evidences)}

RECURSO / DECISÃO PARALELA:
${buildAppealContext(appeal)}

ÚLTIMAS FALAS:
${buildMessagesContext(messages)}

ÚLTIMA MENSAGEM:
${lastMessageText}

============================================================
REGRAS PARA "CONTINUAR JULGAMENTO"
============================================================

Ao receber uma nova solicitação para continuar a audiência,
observe todo o contexto acima.

Não siga uma ordem fixa de participantes.

Não escolha automaticamente o personagem que falou menos.

Não alterne personagens artificialmente.

Considere:
- o conteúdo da última manifestação;
- as manifestações anteriores;
- as provas;
- os participantes presentes;
- as personalidades;
- o estágio processual;
- eventuais decisões paralelas;
- a necessidade de esclarecimentos;
- possíveis objeções;
- possíveis interrupções;
- oportunidades de manifestação do usuário;
- e a evolução natural da audiência.

A decisão deve representar o próximo acontecimento plausível,
mesmo que isso signifique que o mesmo participante volte a agir.

============================================================
FORMATO DA DECISÃO
============================================================

Responda EXCLUSIVAMENTE com um objeto JSON válido.

Não use Markdown.
Não use blocos de código.
Não escreva explicações fora do JSON.

O JSON deve possuir exatamente esta estrutura:

{
  "action": "fala",
  "speakerRole": "juiz",
  "targetRole": null,
  "content": "O conteúdo ou descrição do acontecimento."
}

============================================================
AÇÕES DISPONÍVEIS
============================================================

"fala"
Uma manifestação espontânea de um participante.

"pergunta"
Um participante formula uma pergunta para outro.

"objecao"
Um participante apresenta uma objeção.

"interrupcao"
Um participante interrompe outro de maneira plausível.

"reacao"
Um participante reage ao que acabou de acontecer.

"passar_palavra"
Um participante passa a palavra para outro participante.

"silencio"
Não existe nenhum acontecimento relevante que precise ser produzido
neste momento.

"encerramento"
A audiência está em condições de ser encerrada.

"sentenca"
O contexto processual chegou ao momento apropriado para uma sentença.

============================================================
speakerRole
============================================================

speakerRole identifica o participante que inicia ou conduz o
acontecimento escolhido.

Não significa "próximo da fila".

Para "passar_palavra", speakerRole é quem passa a palavra.

Para "pergunta", speakerRole é quem pergunta.

Para "objecao", speakerRole é quem apresenta a objeção.

Para "interrupcao", speakerRole é quem interrompe.

Para "reacao", speakerRole é quem reage.

Para "fala", speakerRole é quem faz a manifestação.

============================================================
targetRole
============================================================

targetRole identifica o participante diretamente afetado pelo
acontecimento, quando existir.

Se não houver alvo específico, use null.

Exemplos:

Pergunta:
{
  "action": "pergunta",
  "speakerRole": "juiz",
  "targetRole": "testemunha",
  "content": "O juiz pergunta sobre o horário dos fatos."
}

Objeção:
{
  "action": "objecao",
  "speakerRole": "advogado_defesa",
  "targetRole": "promotor",
  "content": "A defesa apresenta uma objeção à pergunta."
}

Interrupção:
{
  "action": "interrupcao",
  "speakerRole": "promotor",
  "targetRole": "advogado_defesa",
  "content": "O promotor interrompe a manifestação da defesa."
}

Passagem de palavra:
{
  "action": "passar_palavra",
  "speakerRole": "juiz",
  "targetRole": "advogado_defesa",
  "content": "O juiz concede a palavra à defesa."
}

============================================================
REGRAS IMPORTANTES
============================================================

NUNCA use uma ação chamada "usuario".

NUNCA use "usuario" como valor de "action".

O usuário é apenas um participante do processo.

Se o usuário for o alvo de uma passagem de palavra, use:

{
  "action": "passar_palavra",
  "speakerRole": "participante_que_passa_a_palavra",
  "targetRole": "${normalizeText(userRole)}",
  "content": "Passagem de palavra plausível."
}

Isso representa uma oportunidade de manifestação.

Não significa que o usuário obrigatoriamente falará.

NUNCA invente uma fala do usuário.

Se não houver um acontecimento plausível, use:

{
  "action": "silencio",
  "speakerRole": null,
  "targetRole": null,
  "content": "Nenhum novo acontecimento relevante neste momento."
}
`;
}
function extractJsonObject(text: string): string | null {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    return null;
  }

  if (lastBrace <= firstBrace) {
    return null;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function cleanDecision(
  value: any
): HearingDirectorDecision {
  const action = normalizeText(value?.action) as HearingAction;

  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(
      `Ação inválida retornada pelo Diretor de audiência: ${action}`
    );
  }

  const speakerRole =
    normalizeText(value?.speakerRole) || null;

  const targetRole =
    normalizeText(value?.targetRole) || null;

  const content =
    normalizeText(value?.content);

  if (action === "silencio") {
    return {
      action,
      speakerRole: null,
      targetRole: null,
      content:
        content ||
        "Nenhum novo acontecimento relevante neste momento.",
    };
  }

  if (action === "encerramento" || action === "sentenca") {
    return {
      action,
      speakerRole,
      targetRole,
      content:
        content ||
        "O estado processual indica que este acontecimento é apropriado.",
    };
  }

  if (!speakerRole) {
    throw new Error(
      `O Diretor marcou a ação "${action}" sem informar speakerRole.`
    );
  }

  return {
    action,
    speakerRole,
    targetRole,
    content:
      content ||
      "O participante deve reagir de acordo com o contexto da audiência.",
  };
}

export async function invokeHearingDirector(
  params: HearingDirectorPromptParams,
  invokeLLM: (request: AIRequest) => Promise<any>
): Promise<HearingDirectorDecision> {
  const prompt = buildHearingDirectorPrompt(params);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um Diretor de Audiência. Siga rigorosamente o formato JSON solicitado.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const rawContent =
    response?.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error(
      "O Diretor de audiência não retornou conteúdo."
    );
  }

  const normalizedContent =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent
            .filter((item: any) => item?.type === "text")
            .map((item: any) => item?.text ?? "")
            .join("\n")
        : String(rawContent);

  const jsonText = extractJsonObject(
    normalizedContent
  );

  if (!jsonText) {
    throw new Error(
      "O Diretor de audiência não retornou um objeto JSON válido."
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Falha ao interpretar a decisão do Diretor: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  return cleanDecision(parsed);
}

export function parseHearingDirectorDecision(
  content: string
): HearingDirectorDecision {
  const jsonText = extractJsonObject(content);

  if (!jsonText) {
    throw new Error(
      "Não foi possível encontrar JSON na resposta do Diretor de audiência."
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `JSON inválido retornado pelo Diretor de audiência: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  return cleanDecision(parsed);
}

