import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Router para Casos Personalizados
 */
export const customTrialRouter = router({
  // Criar caso personalizado a partir de texto livre
  create: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(50),
        isPublic: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Gerar caso estruturado com IA
      const casePrompt = `Com base na seguinte descrição, crie um caso jurídico completo e estruturado:

"${input.prompt}"

O caso deve incluir:
1. Título apropriado
2. Área do direito (penal, civil, trabalhista, CDC, etc.)
3. Descrição detalhada dos fatos
4. Fundamentação legal com artigos específicos
5. Jurisprudência relevante
6. Se admite júri popular (apenas para crimes dolosos contra a vida)
7. Timeline dos eventos principais

Retorne um JSON estruturado.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em direito brasileiro. Crie casos jurídicos realistas e educacionais baseados em descrições fornecidas pelo usuário.",
          },
          { role: "user", content: casePrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "custom_trial",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                area: { type: "string" },
                description: { type: "string" },
                facts: { type: "string" },
                legalBasis: { type: "string" },
                jurisprudence: { type: "string" },
                admiteJuri: { type: "boolean" },
                timeline: { type: "string" },
              },
              required: ["title", "area", "description", "facts", "legalBasis", "admiteJuri"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      const trialData = JSON.parse(typeof content === 'string' ? content : "{}");

      // Criar o trial no banco
      const trialId = await db.createTrial({
        title: trialData.title,
        area: trialData.area,
        description: trialData.description,
        facts: trialData.facts,
        legalBasis: trialData.legalBasis,
        jurisprudence: trialData.jurisprudence || null,
        admiteJuri: trialData.admiteJuri,
        timeline: trialData.timeline || null,
      });

      // Criar registro de caso personalizado
      const customTrialId = await db.createCustomTrial({
        userId: ctx.user.id,
        trialId,
        originalPrompt: input.prompt,
        isPublic: input.isPublic,
        timesPlayed: 0,
        rating: 0,
        tags: input.tags ? JSON.stringify(input.tags) : null,
      });

      return { customTrialId, trialId, trial: trialData };
    }),

  // Listar casos personalizados do usuário
  myTrials: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserCustomTrials(ctx.user.id);
  }),

  // Listar casos públicos da comunidade
  publicTrials: publicProcedure.query(async () => {
    return await db.getPublicCustomTrials();
  }),

  // Obter detalhes de um caso personalizado
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const customTrial = await db.getCustomTrialById(input.id);
      if (!customTrial) throw new Error("Caso não encontrado");

      const trial = await db.getTrialById(customTrial.trialId);
      return { ...customTrial, trial };
    }),

  // Incrementar contador de jogadas
  play: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.incrementCustomTrialPlays(input.id);
      return { success: true };
    }),
});
