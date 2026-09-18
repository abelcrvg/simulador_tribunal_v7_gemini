import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Loader2, ArrowLeft, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  juiz: "Juiz",
  advogado_defesa: "Advogado de Defesa",
  promotor: "Promotor",
  testemunha: "Testemunha",
  perito: "Perito",
  jurado: "Jurado Popular",
};

const statusLabels: Record<string, { label: string; icon: any; variant: any }> = {
  em_andamento: { 
    label: "Em Andamento", 
    icon: PlayCircle, 
    variant: "default" as const 
  },
  concluido: { 
    label: "Concluído", 
    icon: CheckCircle, 
    variant: "secondary" as const 
  },
  abandonado: { 
    label: "Abandonado", 
    icon: XCircle, 
    variant: "destructive" as const 
  },
};

export default function MySessions() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: sessions, isLoading: sessionsLoading } = trpc.session.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (authLoading || sessionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Autenticação Necessária</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para ver suas sessões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Fazer Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/nova-sessao">
              <Button>Nova Sessão</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Início
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-12">
        <div className="container max-w-5xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Minhas Sessões</h2>
            <p className="text-muted-foreground">
              Histórico de todos os seus julgamentos virtuais
            </p>
          </div>

          {!sessions || sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Scale className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma Sessão Encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Você ainda não participou de nenhum julgamento virtual.
                </p>
                <Link href="/nova-sessao">
                  <Button>Iniciar Primeira Sessão</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const statusInfo = statusLabels[session.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={statusInfo.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                            <Badge variant="outline">{roleLabels[session.userRole]}</Badge>
                          </div>
                          <CardTitle className="text-lg">Sessão #{session.id}</CardTitle>
                          <CardDescription>
                            Criada em {new Date(session.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </CardDescription>
                        </div>
                        {session.status === "em_andamento" && (
                          <Link href={`/julgamento/${session.id}`}>
                            <Button>Continuar</Button>
                          </Link>
                        )}
                        {session.status === "concluido" && (
                          <Link href={`/julgamento/${session.id}`}>
                            <Button variant="outline">Ver Detalhes</Button>
                          </Link>
                        )}
                      </div>
                    </CardHeader>
                    {session.verdict && (
                      <CardContent>
                        <div className="bg-muted rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-2">Veredicto:</h4>
                          <p className="text-sm">{session.verdict}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
