import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, BookOpen } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function CampaignPlay() {
  const { campaignId, caseNumber } = useParams<{ campaignId: string; caseNumber: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const campaignIdNum = parseInt(campaignId || "0");
  const caseNum = parseInt(caseNumber || "1");

  const { data: campaign, isLoading: campaignLoading } = trpc.campaign.getById.useQuery(
    { id: campaignIdNum },
    { enabled: campaignIdNum > 0 }
  );

  const { data: progress } = trpc.campaign.getProgress.useQuery(
    { campaignId: campaignIdNum },
    { enabled: isAuthenticated && campaignIdNum > 0 }
  );

  const generateCaseMutation = trpc.trial.generate.useMutation({
    onSuccess: (data) => {
      // Criar sessão e redirecionar para o julgamento
      createSessionMutation.mutate({
        trialId: data.trialId,
        userRole: "juiz", // Pode ser escolhido pelo usuário depois
      });
    },
  });

  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      setLocation(`/julgamento/${data.id}`);
    },
  });

  if (authLoading || campaignLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Campanha não encontrada</p>
          <Button onClick={() => setLocation("/campanhas")} className="mt-4">
            Voltar para Campanhas
          </Button>
        </div>
      </div>
    );
  }

  const storyline = JSON.parse(campaign.storyline || "{}");
  const currentCaseData = storyline.cases?.[caseNum - 1];

  const handleStartCase = () => {
    // Gerar caso baseado na descrição da campanha
    const casePrompt = `${campaign.title} - Caso ${caseNum}: ${currentCaseData?.title}
    
${currentCaseData?.description}

Contexto da campanha: ${storyline.mainStory}

Gere um caso jurídico completo baseado nesta descrição.`;

    generateCaseMutation.mutate({
      area: "penal", // Será determinado pela IA
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/campanhas")}>
            Voltar
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Progresso */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-2">Progresso</h2>
            <p className="text-muted-foreground">
              Caso {caseNum} de {campaign.totalCases}
            </p>
            <div className="mt-4 w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(caseNum / campaign.totalCases) * 100}%` }}
              />
            </div>
          </div>

          {/* História */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">História da Campanha</h2>
            <p className="text-muted-foreground mb-4">{storyline.mainStory}</p>
          </div>

          {/* Caso Atual */}
          {currentCaseData && (
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-2xl font-bold mb-2">Caso {caseNum}: {currentCaseData.title}</h2>
              <p className="text-muted-foreground mb-4">{currentCaseData.description}</p>
              
              {currentCaseData.connection && (
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-1">Conexão com casos anteriores:</p>
                  <p className="text-sm text-muted-foreground">{currentCaseData.connection}</p>
                </div>
              )}

              <Button
                onClick={handleStartCase}
                disabled={generateCaseMutation.isPending || createSessionMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateCaseMutation.isPending || createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando caso...
                  </>
                ) : (
                  "Iniciar Julgamento"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
