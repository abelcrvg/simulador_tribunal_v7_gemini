import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";

/**
 * Router para sistema de voz (debate por áudio)
 */
export const voiceRouter = router({
  /**
   * Processar mensagem de áudio:
   * 1. Transcrever áudio com Whisper
   * 2. Salvar mensagem com audioUrl
   * 3. Gerar resposta da IA
   * 4. Converter resposta para áudio (TTS)
   * 5. Retornar resposta com audioUrl
   */
  sendVoiceMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        audioBase64: z.string(), // Áudio em base64
        mimeType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSessionById(input.sessionId);
      if (!session) throw new Error("Sessão não encontrada");

      const trial = await db.getTrialById(session.trialId);
      if (!trial) throw new Error("Caso não encontrado");

      // 1. Upload do áudio para S3
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const audioKey = `voice/${ctx.user.id}/${input.sessionId}/${Date.now()}.webm`;
      const { url: audioUrl } = await storagePut(audioKey, audioBuffer, input.mimeType);

      // 2. Transcrever áudio com Whisper
      const transcription = await transcribeAudio({
        audioUrl,
        language: "pt",
        prompt: "Transcrição de debate jurídico em tribunal virtual",
      });

      if ('error' in transcription) {
        throw new Error(`Erro na transcrição: ${transcription.error}`);
      }

      const userMessage = transcription.text;

      // 3. Salvar mensagem do usuário com audioUrl
      const userMessageId = await db.createMessage({
        sessionId: input.sessionId,
        role: session.userRole,
        content: userMessage,
        audioUrl,
        isAI: false,
      });

      // 4. Gerar resposta da IA
      const messages = await db.getSessionMessages(input.sessionId);
      const participants = await db.getSessionParticipants(input.sessionId);

      // Determinar quem deve responder
      const aiParticipants = participants.filter(
        (p: any) => p.role !== session.userRole
      );

      if (aiParticipants.length === 0) {
        throw new Error("Nenhum participante IA disponível para responder");
      }

      // Escolher participante relevante para responder
      const respondent =
        aiParticipants.find((p: any) => p.role === "juiz") || aiParticipants[0];

      const conversationHistory = messages
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const systemPrompt = `Você é ${respondent.name}, ${respondent.role} neste julgamento.
PERSONALIDADE: ${respondent.personality}
CASO: ${trial.title}
ÁREA: ${trial.area}
FATOS: ${trial.facts}

Responda de forma natural e em primeira pessoa como ${respondent.name}.
Mantenha o tom profissional e jurídico.
Seja conciso (máximo 3 parágrafos).`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `HISTÓRICO DA CONVERSA:\n${conversationHistory}\n\nÚLTIMA MENSAGEM:\n${session.userRole}: ${userMessage}\n\nResponda como ${respondent.name}:`,
          },
        ],
      });

      const aiResponseContent = response.choices[0]?.message?.content;
      const aiResponse = typeof aiResponseContent === 'string' ? aiResponseContent : "Sem resposta da IA.";

      // 5. Gerar áudio da resposta (TTS)
      // Nota: A Manus não tem TTS built-in ainda, então vamos simular
      // Em produção, você usaria ElevenLabs, Google TTS, ou similar
      const aiAudioUrl = null; // TODO: Implementar TTS quando disponível

      // 6. Salvar resposta da IA
      const aiMessageId = await db.createMessage({
        sessionId: input.sessionId,
        role: respondent.role,
        content: aiResponse,
        audioUrl: aiAudioUrl,
        isAI: true,
      });

      return {
        userMessage: {
          id: userMessageId,
          content: userMessage,
          audioUrl,
          role: session.userRole,
        },
        aiMessage: {
          id: aiMessageId,
          content: aiResponse,
          audioUrl: aiAudioUrl,
          role: respondent.role,
          speaker: respondent.name,
        },
      };
    }),

  /**
   * Gerar áudio (TTS) para uma mensagem existente
   */
  generateTTS: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        text: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implementar TTS quando API estiver disponível
      // Por enquanto, retorna null
      return {
        audioUrl: null,
        message: "TTS não implementado ainda. Use serviço externo como ElevenLabs.",
      };
    }),
});
