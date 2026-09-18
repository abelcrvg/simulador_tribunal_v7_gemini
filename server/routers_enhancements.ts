import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import * as db from "./db";

/**
 * Router para Eventos Aleatórios e Documentos Visuais
 */
export const enhancementsRouter = router({
  // ===== EVENTOS ALEATÓRIOS =====
  events: router({
    // Gerar evento aleatório durante julgamento
    generate: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.getSessionById(input.sessionId);
        if (!session) throw new Error("Sessão não encontrada");

        const trial = await db.getTrialById(session.trialId);
        if (!trial) throw new Error("Caso não encontrado");

        // Tipos de eventos possíveis
        const eventTypes = [
          "testemunha_muda_depoimento",
          "prova_nova",
          "pedido_adiamento",
          "juri_pede_esclarecimento",
        ];

        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        // Gerar evento com IA
        const eventPrompt = `Gere um evento aleatório do tipo "${randomType}" para o seguinte caso:

Título: ${trial.title}
Área: ${trial.area}
Fatos: ${trial.facts}

O evento deve:
1. Ser realista e plausível
2. Adicionar complexidade ao caso
3. Ter impacto significativo no julgamento
4. Ser baseado em situações reais de tribunais brasileiros

Retorne um JSON com:
{
  "title": "Título curto do evento",
  "description": "Descrição detalhada do que aconteceu",
  "impact": {
    "type": "positivo" ou "negativo" ou "neutro",
    "affectedParty": "defesa" ou "acusacao" ou "ambos",
    "details": "Como isso afeta o julgamento"
  }
}`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um especialista em procedimentos judiciais brasileiros.",
            },
            { role: "user", content: eventPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "trial_event",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      affectedParty: { type: "string" },
                      details: { type: "string" },
                    },
                    required: ["type", "affectedParty", "details"],
                    additionalProperties: false,
                  },
                },
                required: ["title", "description", "impact"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        const eventData = JSON.parse(typeof content === 'string' ? content : "{}");

        const eventId = await db.createTrialEvent({
          sessionId: input.sessionId,
          eventType: randomType,
          title: eventData.title,
          description: eventData.description,
          impact: JSON.stringify(eventData.impact),
          isResolved: false,
        });

        return { eventId, event: eventData, eventType: randomType };
      }),

    // Listar eventos de uma sessão
    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTrialEvents(input.sessionId);
      }),

    // Resolver um evento
    resolve: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateTrialEvent(input.eventId, {
          isResolved: true,
          resolvedAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ===== DOCUMENTOS VISUAIS =====
  visualDocs: router({
    // Gerar documento visual com IA
    generate: protectedProcedure
      .input(
        z.object({
          trialId: z.number(),
          category: z.enum(["cena_crime", "planta_baixa", "laudo_pericial", "foto_prova"]),
        })
      )
      .mutation(async ({ input }) => {
        const trial = await db.getTrialById(input.trialId);
        if (!trial) throw new Error("Caso não encontrado");

        let prompt = "";
        let title = "";

        switch (input.category) {
          case "cena_crime":
            title = "Foto da Cena do Crime";
            prompt = `Crie uma imagem realista da cena do crime para o caso: ${trial.title}. Fatos: ${trial.facts}. Estilo: fotografia forense, evidências marcadas, iluminação profissional.`;
            break;
          case "planta_baixa":
            title = "Planta Baixa do Local";
            prompt = `Crie uma planta baixa arquitetônica do local relacionado ao caso: ${trial.title}. Deve incluir medidas, móveis, e pontos relevantes para o caso.`;
            break;
          case "laudo_pericial":
            title = "Laudo Pericial Ilustrado";
            prompt = `Crie uma ilustração técnica para laudo pericial do caso: ${trial.title}. Estilo: diagrama técnico, anotações, medições.`;
            break;
          case "foto_prova":
            title = "Fotografia de Prova Material";
            prompt = `Crie uma fotografia de prova material relacionada ao caso: ${trial.title}. Estilo: fotografia forense com régua de escala.`;
            break;
        }

        // Gerar imagem com IA
        const { url: imageUrl } = await generateImage({ prompt });
        if (!imageUrl) throw new Error("Falha ao gerar imagem");

        // Salvar no banco
        const docId = await db.createVisualDocument({
          trialId: input.trialId,
          type: "image",
          category: input.category,
          title,
          description: `Documento visual gerado por IA para ${trial.title}`,
          fileUrl: imageUrl,
          thumbnailUrl: imageUrl,
          metadata: JSON.stringify({ generatedAt: new Date(), prompt }),
        });

        return { docId, imageUrl, title };
      }),

    // Listar documentos visuais de um caso
    list: protectedProcedure
      .input(z.object({ trialId: z.number() }))
      .query(async ({ input }) => {
        return await db.getVisualDocuments(input.trialId);
      }),
  }),
});
