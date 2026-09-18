import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface HearingHistoryViewProps {
  trialId: number;
}

const hearingTypeLabels: Record<string, string> = {
  inicial: "Audiência Inicial",
  instrucao: "Audiência de Instrução",
  testemunhas: "Oitiva de Testemunhas",
  alegacoes_finais: "Alegações Finais"
};

export default function HearingHistoryView({ trialId }: HearingHistoryViewProps) {
  const { data: hearings, isLoading } = trpc.trial.getHearings.useQuery({ trialId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando histórico de audiências...</div>
      </div>
    );
  }

  if (!hearings || hearings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma audiência anterior registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
      <div className="text-sm text-muted-foreground">
        Total de {hearings.length} audiência{hearings.length > 1 ? "s" : ""} realizada{hearings.length > 1 ? "s" : ""}
      </div>

      {hearings.map((hearing, index) => (
        <Card key={hearing.id} className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {hearingTypeLabels[hearing.type] || hearing.type}
                  {hearing.wasPostponed === "sim" && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Adiada
                    </Badge>
                  )}
                  {hearing.wasPostponed === "nao" && (
                    <Badge variant="secondary" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Realizada
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {hearing.date}
                  </span>
                </CardDescription>
              </div>
              <Badge variant="outline">#{index + 1}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Resumo da Audiência */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resumo
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {hearing.summary}
              </p>
            </div>

            {/* Decisões Intermediárias */}
            {hearing.intermediateDecisions && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Decisões Intermediárias
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {hearing.intermediateDecisions}
                  </p>
                </div>
              </>
            )}

            {/* Motivo do Adiamento */}
            {hearing.wasPostponed === "sim" && hearing.postponementReason && (
              <>
                <Separator />
                <div className="bg-destructive/10 p-3 rounded-md">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Motivo do Adiamento
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {hearing.postponementReason}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="text-xs text-center text-muted-foreground pt-4">
        Audiências listadas em ordem cronológica
      </div>
    </div>
  );
}
