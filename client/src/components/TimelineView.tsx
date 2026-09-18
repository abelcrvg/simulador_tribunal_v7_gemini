import { trpc } from "@/lib/trpc";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface TimelineViewProps {
  trialId: number;
}

export function TimelineView({ trialId }: TimelineViewProps) {
  const { data, isLoading, error } = trpc.trial.getTimeline.useQuery({ trialId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando cronologia...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground">Erro ao carregar cronologia do caso.</p>
      </div>
    );
  }

  const { timeline, policeReports } = data;

  if (!timeline && (!policeReports || policeReports.length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Cronologia não disponível para este caso.</p>
        <p className="text-sm mt-2">(Apenas casos criminais possuem cronologia detalhada)</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[60vh] pr-4">
      <div className="space-y-6">
        {/* Cronologia dos Eventos */}
        {timeline && timeline.events && timeline.events.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cronologia dos Eventos
            </h3>
            <div className="space-y-3">
              {timeline.events.map((event: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-primary">{event.date}</CardTitle>
                    <CardDescription className="font-semibold text-foreground">{event.event}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Relatório da Cena do Crime */}
        {timeline && timeline.crimeSceneReport && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
                🔍 Relatório da Cena do Crime (Perícia)
              </h3>
              <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {timeline.crimeSceneReport}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Qualidade das Provas */}
        {timeline && timeline.evidenceQuality && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4">⚖️ Análise da Qualidade das Provas</h3>
              <Card className={`border-l-4 ${
                timeline.evidenceQuality === 'forte' ? 'border-l-green-500 bg-green-50 dark:bg-green-950/30' :
                timeline.evidenceQuality === 'moderada' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' :
                'border-l-red-500 bg-red-50 dark:bg-red-950/30'
              }`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Qualidade: <span className="capitalize">{timeline.evidenceQuality}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{timeline.evidenceQualityNote}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Depoimentos à Polícia */}
        {policeReports && policeReports.length > 0 && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                👮 Depoimentos Prestados à Polícia
              </h3>
              <div className="space-y-4">
                {policeReports.map((report: any) => (
                  <Card key={report.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{report.personName}</span>
                        <span className="text-sm font-normal text-muted-foreground capitalize">
                          {report.personRole}
                        </span>
                      </CardTitle>
                      <CardDescription>Depoimento em {report.date}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">Depoimento:</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                          {report.statement}
                        </p>
                      </div>
                      {report.contradictions && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded border-l-4 border-yellow-500">
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            ⚠️ Possíveis Contradições:
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            {report.contradictions}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
