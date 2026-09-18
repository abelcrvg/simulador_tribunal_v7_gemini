import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Gavel, DollarSign, Calendar, FileText, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FinalDecisionViewProps {
  sessionId: number;
  userRole: string;
}

export default function FinalDecisionView({ sessionId, userRole }: FinalDecisionViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: session, refetch } = trpc.session.getById.useQuery({ id: sessionId });
  const generateDecisionMutation = trpc.session.generateFinalDecision.useMutation();

  const handleGenerateDecision = async () => {
    if (userRole !== 'juiz') {
      toast.error("Apenas o juiz pode gerar a decisão final");
      return;
    }

    setIsGenerating(true);
    try {
      await generateDecisionMutation.mutateAsync({ sessionId });
      await refetch();
      toast.success("⚖️ Sentença gerada com sucesso!", {
        description: "Próximos passos: Solicitar Votação do Júri (se aplicável) e depois Solicitar Feedback para ver sua performance.",
        duration: 8000,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar decisão final");
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse da decisão se existir
  let decision = null;
  if (session?.decisionDetails) {
    try {
      decision = JSON.parse(session.decisionDetails);
    } catch (e) {
      console.error("Erro ao parsear decisão:", e);
    }
  }

  // Se não há decisão ainda
  if (!decision) {
    if (userRole !== 'juiz') {
      return (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Aguardando Decisão Final
            </CardTitle>
            <CardDescription>
              O juiz ainda não proferiu a sentença final deste julgamento.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Gerar Decisão Final
          </CardTitle>
          <CardDescription>
            Como juiz, você pode gerar a sentença fundamentada completa baseada em todo o histórico do julgamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerateDecision} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando Sentença...
              </>
            ) : (
              <>
                <Gavel className="mr-2 h-4 w-4" />
                Proferir Sentença Final
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Exibir decisão completa
  const veredictoColors: Record<string, string> = {
    culpado: "text-red-600 bg-red-50 border-red-200",
    inocente: "text-green-600 bg-green-50 border-green-200",
    procedente: "text-blue-600 bg-blue-50 border-blue-200",
    improcedente: "text-gray-600 bg-gray-50 border-gray-200",
    parcialmente_procedente: "text-amber-600 bg-amber-50 border-amber-200",
  };

  const veredictoLabels: Record<string, string> = {
    culpado: "CULPADO",
    inocente: "INOCENTE",
    procedente: "PROCEDENTE",
    improcedente: "IMPROCEDENTE",
    parcialmente_procedente: "PARCIALMENTE PROCEDENTE",
  };

  return (
    <ScrollArea className="h-[70vh]">
      <div className="space-y-4 p-1">
        {/* Veredicto */}
        <Card className={`border-2 ${veredictoColors[decision.veredicto] || "border-gray-200"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gavel className="h-6 w-6" />
              Veredicto: {veredictoLabels[decision.veredicto] || decision.veredicto.toUpperCase()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Sentença Fundamentada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sentença Fundamentada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {decision.sentencaFundamentada}
            </div>
          </CardContent>
        </Card>

        {/* Valores de Indenização */}
        {decision.valoresIndenizacao && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valores de Indenização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Danos Morais:</span>
                  <span className="text-green-600 font-bold">
                    R$ {decision.valoresIndenizacao.danosMorais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Danos Materiais:</span>
                  <span className="text-green-600 font-bold">
                    R$ {decision.valoresIndenizacao.danosMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">TOTAL:</span>
                  <span className="text-green-600 font-bold text-lg">
                    R$ {decision.valoresIndenizacao.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prazos de Pagamento */}
        {decision.prazosPagamento && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Prazos de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{decision.prazosPagamento}</p>
            </CardContent>
          </Card>
        )}

        {/* Status de Cumprimento */}
        <Card>
          <CardHeader>
            <CardTitle>Status de Cumprimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                decision.statusCumprimento === 'cumprido' ? 'bg-green-500' :
                decision.statusCumprimento === 'em_andamento' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span className="font-medium capitalize">{decision.statusCumprimento.replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recursos Cabíveis */}
        {decision.recursosCabiveis && decision.recursosCabiveis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recursos Cabíveis</CardTitle>
              <CardDescription>
                As partes podem interpor os seguintes recursos contra esta decisão:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {decision.recursosCabiveis.map((recurso: string, index: number) => (
                  <li key={index} className="capitalize">{recurso}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Fundamentação Legal */}
        {decision.fundamentacaoLegal && decision.fundamentacaoLegal.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fundamentação Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {decision.fundamentacaoLegal.map((artigo: string, index: number) => (
                  <li key={index} className="text-sm">{artigo}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {decision.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{decision.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
