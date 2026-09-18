import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { APP_TITLE, getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function CreateCustomTrial() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const createMutation = trpc.customTrial.create.useMutation({
    onSuccess: (data) => {
      toast.success("Caso personalizado criado com sucesso!");
      setLocation(`/nova-sessao?trialId=${data.trialId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar caso: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (prompt.length < 50) {
      toast.error("Por favor, descreva o caso com pelo menos 50 caracteres.");
      return;
    }

    createMutation.mutate({ prompt, isPublic });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{APP_TITLE} - Criar Caso Personalizado</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Voltar
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Descreva Seu Caso
            </CardTitle>
            <CardDescription>
              Descreva o caso jurídico que você deseja simular. A IA irá gerar um caso completo e
              estruturado baseado na sua descrição, incluindo fatos, fundamentação legal, provas e
              participantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Descrição do Caso</Label>
                <Textarea
                  id="prompt"
                  placeholder="Exemplo: Um homem foi acusado de furtar um celular em uma loja de eletrônicos. Ele alega que estava apenas testando o aparelho e não tinha intenção de levá-lo. Há câmeras de segurança que mostram ele saindo da loja com o celular no bolso..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {prompt.length} / 50 caracteres mínimos
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="public">Tornar Público</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que outros usuários joguem este caso
                  </p>
                </div>
                <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">💡 Dicas para um bom caso:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Seja específico sobre os fatos e circunstâncias</li>
                  <li>• Mencione a área do direito (penal, civil, trabalhista, etc.)</li>
                  <li>• Inclua detalhes sobre as partes envolvidas</li>
                  <li>• Descreva as evidências disponíveis</li>
                  <li>• Quanto mais detalhes, melhor será o caso gerado!</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando caso com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Caso Personalizado
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
