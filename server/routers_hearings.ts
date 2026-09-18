import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Gera histórico de audiências anteriores para um caso
 */
export async function generateHearingsForTrial(
  trialId: number,
  trialData: any
) {
  const hearingsPrompt = `Você é um ESCRIVÃO DE TRIBUNAL experiente gerando o histórico de audiências de um caso judicial brasileiro.

=== INFORMAÇÕES DO CASO ===
Título: ${trialData.title}
Área: ${trialData.area}
Descrição: ${trialData.description}
Fatos: ${trialData.facts}

=== SUA MISSÃO ===
Gere um histórico REALISTA de 2-4 audiências que já ocorreram ANTES do julgamento atual.

TIPOS DE AUDIÊNCIAS (escolha entre):
- "inicial" - Audiência de conciliação ou primeira apresentação
- "instrucao" - Audiência de instrução e julgamento
- "testemunhas" - Oitiva de testemunhas
- "alegacoes_finais" - Alegações finais das partes

REGRAS IMPORTANTES:
1. As audiências devem estar em ORDEM CRONOLÓGICA (mais antiga primeiro).
2. Datas devem ser ANTERIORES ao julgamento atual (últimos 6-18 meses).
3. Pelo menos UMA audiência pode ter sido ADIADA (wasPostponed: "sim").
4. Resumos devem ser ESPECÍFICOS ao caso, nunca genéricos.
5. Decisões intermediárias podem incluir: deferimento de provas, nomeação de perito, prazo para manifestação, etc.
6. Se houve adiamento, especificar motivo realista (ausência de testemunha, falta de intimação, pedido de prazo, etc.).
7. Utilize os nomes, fatos, provas e circunstâncias fornecidos nas informações do caso quando disponíveis.
8. As datas devem ser coerentes e espaçadas por semanas ou meses.

=== FORMATO JSON OBRIGATÓRIO ===

Retorne EXCLUSIVAMENTE um objeto JSON neste formato:

{
  "hearings": [
    {
      "type": "inicial",
      "date": "15/03/2024 às 14h30",
      "summary": "Descrição detalhada do que ocorreu nesta audiência específica",
      "intermediateDecisions": "Decisões tomadas pelo juiz",
      "wasPostponed": "nao",
      "postponementReason": null
    },
    {
      "type": "testemunhas",
      "date": "22/05/2024 às 10h00",
      "summary": "Descrição detalhada do que ocorreu nesta audiência",
      "intermediateDecisions": "Decisões tomadas pelo juiz",
      "wasPostponed": "sim",
      "postponementReason": "Motivo do adiamento"
    }
  ]
}

IMPORTANTE:
- Gere entre 2 e 4 audiências.
- A propriedade "hearings" DEVE existir.
- "hearings" DEVE ser um array.
- Seja ESPECÍFICO ao caso.
- As audiências devem estar em ordem cronológica.
- Pelo menos uma audiência deve ter uma decisão intermediária relevante.
- "wasPostponed" deve ser SOMENTE "sim" ou "nao".
- Quando não houver decisão intermediária, use null.
- Quando não houver motivo de adiamento, use null.
- Não use Markdown.
- Não coloque o JSON dentro de blocos de código.
- Não escreva nenhum texto antes ou depois do JSON.

Gere AGORA o histórico de audiências em formato JSON.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um escrivão judicial experiente que gera históricos de audiências realistas. Responda seguindo exatamente o formato JSON solicitado."
      },
      {
        role: "user",
        content: hearingsPrompt
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "hearings_history",
        strict: true,
        schema: {
          type: "object",
          properties: {
            hearings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string"
                  },
                  date: {
                    type: "string"
                  },
                  summary: {
                    type: "string"
                  },
                  intermediateDecisions: {
                    type: ["string", "null"]
                  },
                  wasPostponed: {
                    type: "string"
                  },
                  postponementReason: {
                    type: ["string", "null"]
                  }
                },
                required: [
                  "type",
                  "date",
                  "summary",
                  "intermediateDecisions",
                  "wasPostponed",
                  "postponementReason"
                ],
                additionalProperties: false
              }
            }
          },
          required: ["hearings"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;

  if (!content || typeof content !== "string") {
    throw new Error(
      "Falha ao gerar histórico de audiências: resposta vazia da IA"
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Falha ao interpretar histórico de audiências como JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  /*
   * Compatibilidade:
   *
   * O formato esperado é:
   * {
   *   "hearings": [...]
   * }
   *
   * Mas algumas IAs podem retornar diretamente:
   * [
   *   {...},
   *   {...}
   * ]
   *
   * Aceitamos os dois formatos para evitar que uma
   * variação da resposta da IA quebre a criação do caso.
   */
  const hearings = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.hearings)
      ? parsed.hearings
      : [];

  if (hearings.length === 0) {
    throw new Error(
      "IA retornou histórico de audiências em formato inválido: nenhuma audiência encontrada"
    );
  }

  const hearingsData = hearings.map((h: any) => ({
    trialId,
    type: h.type,
    date: h.date,
    summary: h.summary,
    intermediateDecisions: h.intermediateDecisions ?? null,
    wasPostponed: h.wasPostponed === "sim" ? "sim" : "nao",
    postponementReason: h.postponementReason ?? null
  }));

  // Salvar no banco
  await db.createHearings(hearingsData);

  return hearingsData;
}
