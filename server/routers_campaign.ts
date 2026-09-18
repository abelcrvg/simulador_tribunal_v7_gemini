import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Router para funcionalidades de Modo Campanha
 */
export const campaignRouter = router({
  // Listar todas as campanhas públicas
  list: publicProcedure.query(async () => {
    return await db.getAllCampaigns();
  }),

  // Obter detalhes de uma campanha
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCampaignById(input.id);
    }),

  // Criar uma nova campanha (gerada por IA)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        difficulty: z.enum(["facil", "medio", "dificil", "expert"]),
        totalCases: z.number().min(3).max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Gerar storyline da campanha com IA
      const storylinePrompt = `Crie uma narrativa jurídica conectada para uma campanha de ${input.totalCases} casos.

Título: ${input.title}
Descrição: ${input.description}
Dificuldade: ${input.difficulty}

A narrativa deve:
1. Ter uma história central que conecta todos os casos
2. Cada caso deve ter consequências que afetam os próximos
3. Incluir personagens recorrentes
4. Ter um arco narrativo com início, meio e fim
5. Ser realista e baseada em leis brasileiras

Retorne um JSON com a estrutura:
{
  "mainStory": "História principal da campanha",
  "cases": [
    {
      "caseNumber": 1,
      "title": "Título do caso",
      "description": "Descrição breve",
      "connection": "Como se conecta com casos anteriores",
      "consequences": "Possíveis consequências para casos futuros"
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em direito brasileiro criando campanhas educacionais de casos jurídicos conectados.",
          },
          { role: "user", content: storylinePrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "campaign_storyline",
            strict: true,
            schema: {
              type: "object",
              properties: {
                mainStory: { type: "string" },
                cases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      caseNumber: { type: "integer" },
                      title: { type: "string" },
                      description: { type: "string" },
                      connection: { type: "string" },
                      consequences: { type: "string" },
                    },
                    required: ["caseNumber", "title", "description", "connection", "consequences"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["mainStory", "cases"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      const storyline = JSON.parse(typeof content === 'string' ? content : "{}");

      const campaignId = await db.createCampaign({
        title: input.title,
        description: input.description,
        difficulty: input.difficulty,
        totalCases: input.totalCases,
        storyline: JSON.stringify(storyline),
        isPublic: true,
        createdBy: ctx.user.id,
      });

      return { campaignId, storyline };
    }),

  // Iniciar uma campanha
  start: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se já existe progresso
      const existing = await db.getCampaignProgress(ctx.user.id, input.campaignId);
      if (existing) {
        return { progressId: existing.id, currentCase: existing.currentCase };
      }

      // Criar novo progresso
      const progressId = await db.createCampaignProgress({
        userId: ctx.user.id,
        campaignId: input.campaignId,
        currentCase: 1,
        completedCases: 0,
        decisions: JSON.stringify([]),
        status: "em_andamento",
      });

      return { progressId, currentCase: 1 };
    }),

  // Obter progresso do usuário em uma campanha
  getProgress: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await db.getCampaignProgress(ctx.user.id, input.campaignId);
    }),

  // Avançar para o próximo caso
  advanceCase: protectedProcedure
    .input(
      z.object({
        progressId: z.number(),
        decision: z.object({
          caseNumber: z.number(),
          verdict: z.string(),
          keyChoices: z.array(z.string()),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const progress = await db.getCampaignProgress(0, 0); // Buscar por ID
      if (!progress) throw new Error("Progresso não encontrado");

      const decisions = JSON.parse(progress.decisions || "[]");
      decisions.push(input.decision);

      const newCurrentCase = progress.currentCase + 1;
      const newCompletedCases = progress.completedCases + 1;

      await db.updateCampaignProgress(input.progressId, {
        currentCase: newCurrentCase,
        completedCases: newCompletedCases,
        decisions: JSON.stringify(decisions),
      });

      return { currentCase: newCurrentCase, completedCases: newCompletedCases };
    }),

  // Completar campanha
  complete: protectedProcedure
    .input(z.object({ progressId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateCampaignProgress(input.progressId, {
        status: "concluido",
        completedAt: new Date(),
      });

      return { success: true };
    }),

  // Listar campanhas do usuário
  myProgress: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserCampaigns(ctx.user.id);
  }),
});
