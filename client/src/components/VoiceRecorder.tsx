import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceRecorderProps {
  sessionId: number;
  onMessageSent?: () => void;
}

export default function VoiceRecorder({ sessionId, onMessageSent }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sendVoiceMutation = trpc.voice.sendVoiceMessage.useMutation({
    onSuccess: (data) => {
      toast.success("Mensagem de voz enviada!");
      
      // Auto-reproduzir resposta da IA se houver áudio
      if (data.aiMessage.audioUrl) {
        const audio = new Audio(data.aiMessage.audioUrl);
        audio.play();
      }
      
      onMessageSent?.();
      setAudioBlob(null);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        
        // Auto-enviar após parar gravação
        sendAudio(audioBlob);
        
        // Parar stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("🎤 Gravando... Clique novamente para parar.");
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast.error("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudio = async (blob: Blob) => {
    // Converter blob para base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const base64Data = base64Audio.split(",")[1]; // Remover prefixo "data:audio/webm;base64,"

      sendVoiceMutation.mutate({
        sessionId,
        audioBase64: base64Data,
        mimeType: "audio/webm",
      });
    };
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={toggleRecording}
        disabled={sendVoiceMutation.isPending}
        className={`min-h-[44px] ${
          isRecording
            ? "bg-red-600 hover:bg-red-700 animate-pulse"
            : "bg-primary hover:bg-primary/90"
        }`}
      >
        {sendVoiceMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processando...
          </>
        ) : isRecording ? (
          <>
            <MicOff className="h-4 w-4 mr-2" />
            Parar Gravação
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            Falar
          </>
        )}
      </Button>

      {isRecording && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Gravando...</span>
        </div>
      )}
    </div>
  );
}
