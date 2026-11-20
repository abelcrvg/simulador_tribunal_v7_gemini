import type { AIRequest } from "./types";

export type HearingAction =
  | "fala"
  | "pergunta"
  | "objecao"
  | "interrupcao"
  | "aparte"
  | "reacao"
  | "repreensao"
  | "revelacao"
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
  instancia?: string | null;
  appeal?: any | null;
}

/** No STF todos os julgadores têm role "ministro". O identificador "usuario"
 * é o único alvo não ambíguo para a passagem de palavra, conforme a regra
 * "NUNCA use uma ação chamada usuario" (ação ≠ targetRole). */
const USER_TARGET_ROLE = "usuario";

const VALID_ACTIONS: HearingAction[] = [
  "fala",
  "pergunta",
  "objecao",
  "interrupcao",
  "aparte",
  "reacao",
  "repreensao",
  "revelacao",
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

      const isUser = participant.isUser === true;

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
      const confrontations = Array.isArray(evidence.confrontacoes)
        ? evidence.confrontacoes
            .map((c: any) => `- ${normalizeText(c.autor || "parte")}: ${normalizeText(c.texto)}`)
            .join("\n")
        : "";

      return [
        `${index + 1}. ${normalizeText(evidence.title)}`,
        `Descrição: ${normalizeText(evidence.description)}`,
        evidence.origem ? `Origem: ${normalizeText(evidence.origem)}` : null,
        evidence.dataColeta ? `Coleta: ${normalizeText(evidence.dataColeta)}` : null,
        evidence.custodia ? `Custódia: ${normalizeText(evidence.custodia)}` : null,
        confrontations ? `Confrontos registrados:\n${confrontations}` : null,
      ].filter(Boolean).join("\n");
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
    instancia,
    appeal,
  } = params;

  const realMessages = messages.filter(
    (message: any) => message.role !== "sistema"
  );

  const lastMessage = realMessages.slice(-1)[0];

  const lastMessageText = lastMessage
    ? `[${normalizeText(lastMessage.role)}] ${normalizeText(lastMessage.content)}`
    : "Nenhuma fala anterior.";

  // A instância é a fonte autoritativa: sessões antigas podem não ter a área
  // "stf_constitucional" preenchida, mas chegam como "terceira" do recurso.
  const isSTFSession =
    trial?.area === "stf_constitucional" ||
    userRole === "ministro" ||
    instancia === "terceira";

  return `
Você é o DIRETOR DE AUDIÊNCIA de um simulador de tribunal brasileiro.

Sua função é administrar o ESTADO NARRATIVO E PROCESSUAL da audiência.

Você NÃO é um personagem.

Você NÃO deve interpretar juiz, promotor, advogado, testemunha, perito,
réu ou usuário.

Você NÃO tem acesso à verdade objetiva do caso e NÃO deve presumi-la.
Trate apenas a narrativa pública/denúncia, as provas e tudo que foi
debatido nesta audiência como material disponível.

Sua função é observar o que aconteceu e decidir qual é o
ACONTECIMENTO MAIS PLAUSÍVEL para fazer a audiência avançar.
${isSTFSession ? `
============================================================
MODALIDADE: SESSÃO PLENÁRIA DO SUPREMO TRIBUNAL FEDERAL (STF)
============================================================
Esta sessão ocorre no PLENÁRIO DO STF (Julgamento Constitucional Colegiado).
NÃO é uma audiência penal comum de 1ª instância (não há réu preso nem inquirição de testemunhas fáticas).

Dinâmica Processual do Plenário do STF:
1. Manifestações da Tribuna: O Procurador-Geral da República (PGR) e os Advogados Constitucionalistas realizam sustentação oral técnica sobre a Constituição Federal de 1988 (CF/88).
2. Debates e Votos dos Ministros: Os Ministros dialogam entre si com alta erudição jurídica.
   - Votos acompanhando o Relator ou abrindo divergência.
   - Pedidos de Aparte ("Permite um aparte, eminente colega?").
   - Pedidos de Vista ("Peço vista dos autos").
   - Discussão sobre modulação de efeitos e fixação da tese de repercussão geral.
3. O usuário é o participante ${normalizeText(userName)} (Papel: ${normalizeText(userRole)}). Quando houver oportunidade para ele votar ou debater, use a ação "passar_palavra" com targetRole: "usuario".
` : ""}

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

NUNCA se refira ao usuário como "Usuário Local" ou "Usuário". Seu nome e título é ${normalizeText(userName)}.

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
Fatos: ${normalizeText(
    trial?.facts && typeof trial.facts === 'object' && typeof trial.facts.publicNarrative === 'string'
      ? trial.facts.publicNarrative
      : (typeof trial?.facts === 'string' ? trial.facts : "")
  )}

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

"aparte"
Um participante fala fora da vez, sem pedir licença ou sem esperar
que a palavra lhe seja concedida. Pode ser um comentário rápido,
uma reclamação, um insulto contido ou uma observação que ninguém
esperava ouvir. Use quando a cena pedir espontaneidade.

"reacao"
Um participante reage ao que acabou de acontecer.

"repreensao"
Quem conduz a sessão chama alguém à ordem depois de uma fala fora
de vez, de um excesso ou de uma provocação. Não é uma punição
automática: pode haver riso nervoso, silêncio, resistência ou uma
justificativa do repreendido. No STF, quem repreende é a presidência.

"revelacao"
Alguém traz um fato concreto e inesperado que muda a atenção de
todos: um documento, uma contradição, uma data, uma gravação, uma
confissão parcial, um detalhe material. Não invente prova nova sem
base no caso; explore algo que já existe nos autos ou no depoimento.
Depois de uma revelação, a reação dos outros participantes é parte
natural da cena.

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

Aparte fora de vez:
{
  "action": "aparte",
  "speakerRole": "reu",
  "targetRole": "juiz",
  "content": "O réu se levanta e corrige a data que a testemunha acabou de dizer."
}

Repreensão:
{
  "action": "repreensao",
  "speakerRole": "juiz",
  "targetRole": "advogado_defesa",
  "content": "O juiz pede silêncio e lembra que as perguntas devem ser formuladas com urbanidade."
}

Revelação:
{
  "action": "revelacao",
  "speakerRole": "testemunha",
  "targetRole": "promotor",
  "content": "A testemunha recorda que o boletim registra outro horário e todos se voltam para o documento."
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

Não existe vez obrigatória. Qualquer participante pode falar fora
da vez, interromper ou trazer um fato concreto que chame a atenção
geral. Não transforme isso em regra mecânica: use "aparte",
"revelacao", "repreensao" ou "reacao" apenas quando fizer sentido
para a personalidade e o momento da cena.

Uma repreensão não é automática. O juiz pode ignorar, advertir,
pedir calma ou até ser provocado. Os participantes têm livre
arbítrio e podem resistir, mentir, se contradizer ou mudar de tom.

NUNCA use uma ação chamada "usuario".

NUNCA use "usuario" como valor de "action".

O usuário é apenas um participante do processo.

Se o usuário for o alvo de uma passagem de palavra, use SEMPRE "usuario" como targetRole (NUNCA o role dele: no STF, "ministro" também é a role dos ministros de IA e não identifica o usuário):

{
  "action": "passar_palavra",
  "speakerRole": "participante_que_passa_a_palavra",
  "targetRole": "${USER_TARGET_ROLE}",
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
  if (!text) return null;
  let cleaned = text.trim();

  // 1. Remover blocos de raciocínio de modelos reasoning (<think>...</think>)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Extrair bloco de código markdown se presente
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function cleanDecision(
  value: any
): HearingDirectorDecision {
  let action = normalizeText(value?.action) as HearingAction;

  if (!VALID_ACTIONS.includes(action)) {
    action = "fala";
  }

  let speakerRole =
    normalizeText(value?.speakerRole) || null;

  let targetRole =
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

  if (action === "passar_palavra" && !targetRole && speakerRole) {
    targetRole = speakerRole;
  }

  return {
    action,
    speakerRole,
    targetRole,
    content:
      content ||
      "O participante deve manifestar-se de acordo com o contexto da audiência.",
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

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return cleanDecision(parsed);
    } catch {
      // Falha no parse estrito, recorrer ao fallback seguro
    }
  }

  console.warn("[HearingDirector] Não foi possível fazer parse estrito do JSON da IA. Usando decisão de prosseguimento padrão.");
  return {
    action: "fala",
    speakerRole: null,
    targetRole: null,
    content: "Prosseguir com o julgamento.",
  };
}

