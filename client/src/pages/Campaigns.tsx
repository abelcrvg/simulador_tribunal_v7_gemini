import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BookOpen, Play, Trophy, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { APP_TITLE, getLoginUrl } from "@/const";

export default function Campaigns() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery();
  const startCampaign = trpc.campaign.start.useMutation();

  const handleStartCampaign = async (campaignId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    try {
      const result = await startCampaign.mutateAsync({ campaignId });
      setLocation(`/campanha/${campaignId}/caso/${result.currentCase}`);
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "facil":
        return "bg-green-500";
      case "medio":
        return "bg-yellow-500";
      case "dificil":
        return "bg-orange-500";
      case "expert":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "facil":
        return "Fácil";
      case "medio":
        return "Médio";
      case "dificil":
        return "Difícil";
      case "expert":
        return "Expert";
      default:
        return difficulty;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{APP_TITLE} - Modo Campanha</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Voltar
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Campanhas Disponíveis</h2>
          <p className="text-muted-foreground">
            Jogue uma série de casos conectados com uma narrativa envolvente. Suas decisões afetam os
            próximos casos!
          </p>
        </div>

        {campaigns && campaigns.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma campanha disponível</h3>
              <p className="text-muted-foreground">
                Novas campanhas serão adicionadas em breve. Volte mais tarde!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl">{campaign.title}</CardTitle>
                  <Badge className={getDifficultyColor(campaign.difficulty)}>
                    {getDifficultyLabel(campaign.difficulty)}
                  </Badge>
                </div>
                <CardDescription>{campaign.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>{campaign.totalCases} casos conectados</span>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleStartCampaign(campaign.id)}
                    disabled={startCampaign.isPending}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {startCampaign.isPending ? "Iniciando..." : "Iniciar Campanha"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
