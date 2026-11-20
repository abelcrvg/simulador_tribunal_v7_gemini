import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Loader2, ArrowLeft, Send, Info, FileText, Users, Car, FileStack, Gavel, MessageSquareText, Hammer, PlayCircle, Clock, ChevronRight, Menu } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import HearingHistoryView from "@/components/HearingHistoryView";
import FinalDecisionView from "@/components/FinalDecisionView";
import { ThemeSelector } from "@/components/ThemeSelector";


// Componente auxiliar para solicitar votação do júri
function SolicitarVotacaoButton({ sessionId }: { sessionId: number }) {
  const solicitarVotacao = trpc.juryVote.solicitarVotacao.useMutation({
    onSuccess: () => {
      alert('Votação do júri solicitada com sucesso! Os votos foram gerados.');
      window.location.reload();
    },
    onError: (error) => {
      alert(error.message || 'Erro ao solicitar votação do júri');
    },
  });

  return (
    <Button
      variant="default"
      size="sm"
      className="gap-2 min-h-[44px] text-sm md:text-base px-4 bg-amber-600 hover:bg-amber-700"
      onClick={() => solicitarVotacao.mutate({ sessionId })}
      disabled={solicitarVotacao.isPending}
    >
      {solicitarVotacao.isPending ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Gerando votos...</span><span className="sm:hidden">Gerando...</span></>
      ) : (
        <><Gavel className="h-4 w-4" /> <span className="hidden sm:inline">Solicitar Votação do Júri</span><span className="sm:hidden">Solicitar Júri</span></>
      )}
    </Button>
  );
}

// Componente para interpor recurso
function InterporRecursoForm({ sessionId }: { sessionId: number }) {
  const [tipo, setTipo] = useState<"apelacao" | "agravo" | "embargos">("apelacao");
  const [razoes, setRazoes] = useState("");
  const [recorrente, setRecorrente] = useState("");

  const interporRecurso = trpc.appeal.create.useMutation({
    onSuccess: () => {
      alert('✅ Recurso interposto com sucesso! Aguarde o julgamento do tribunal.');
      window.location.reload();
    },
    onError: (error) => {
      alert(`❌ Erro ao interpor recurso: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razoes.trim()) {
      alert("Por favor, preencha as razões do recurso.");
      return;
    }
    if (!recorrente) {
      alert("Por favor, identifique quem está recorrendo (defesa ou acusação).");
      return;
    }
    interporRecurso.mutate({ sessionId, tipo, recorrente, razoes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Quem está recorrendo?</label>
        <select
          value={recorrente}
          onChange={(e) => setRecorrente(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Selecione...</option>
          <option value="defesa">Defesa</option>
          <option value="acusacao">Acusação/Parte Contrária</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Tipo de Recurso</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="apelacao">Apelação</option>
          <option value="agravo">Agravo</option>
          <option value="embargos">Embargos</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {tipo === "apelacao" && "Recurso contra sentença de mérito"}
          {tipo === "agravo" && "Recurso contra decisões interlocutórias"}
          {tipo === "embargos" && "Recurso para esclarecer contradições ou omissões"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Razões do Recurso (Argumentação Jurídica)
        </label>
        <Textarea
          value={razoes}
          onChange={(e) => setRazoes(e.target.value)}
          placeholder="Apresente seus argumentos jurídicos explicando por que a sentença deve ser reformada ou anulada. Cite leis, jurisprudências e princípios processuais..."
          className="min-h-[200px]"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 Foque em QUESTÕES DE DIREITO (aplicação da lei, interpretação jurídica, vícios processuais)
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={interporRecurso.isPending}
      >
        {interporRecurso.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Interpondo recurso...</>
        ) : (
          <><Hammer className="h-4 w-4 mr-2" /> Interpor Recurso</>
        )}
      </Button>
    </form>
  );
}

// Componente para visualizar acórdão
function AcordaoView({ sessionId }: { sessionId: number }) {
  const { data: appeal, isLoading: loadingAppeal } = trpc.appeal.get.useQuery({ sessionId });
  const { data: judges, isLoading: loadingJudges } = trpc.appeal.getJudges.useQuery(
    { appealId: appeal?.id || 0 },
    { enabled: !!appeal?.id }
  );

  const julgarRecurso = trpc.appeal.judge.useMutation({
    onSuccess: (data) => {
      if (data.newSessionId) {
        alert(`⚚️ Recurso julgado! Decisão: ${data.decisao.toUpperCase()}. Uma nova sessão foi criada para a próxima instância.`);
      } else {
        alert('⚚️ Recurso julgado! Veja a decisão dos desembargadores.');
      }
      window.location.reload();
    },
    onError: (error) => {
      alert(`❌ Erro ao julgar recurso: ${error.message}`);
    },
  });

  if (loadingAppeal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando recurso...</p>
      </div>
    );
  }

  if (!appeal) {
    return <p className="text-center text-muted-foreground py-8">Nenhum recurso interposto para esta sessão.</p>;
  }

  return (
    <ScrollArea className="max-h-[80vh] pr-4">
      <div className="space-y-6">
        {/* Informações do Recurso */}
        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border-l-4 border-orange-500">
          <h4 className="font-semibold text-lg mb-2">📄 Informações do Recurso</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Tipo:</strong> {appeal.tipo.charAt(0).toUpperCase() + appeal.tipo.slice(1)}</p>
            <p><strong>Recorrente:</strong> {appeal.recorrente.charAt(0).toUpperCase() + appeal.recorrente.slice(1)}</p>
            <p><strong>Status:</strong> {appeal.status === "pendente" ? "Pendente de Julgamento" : "Julgado"}</p>
          </div>
        </div>

        {/* Razões do Recurso */}
        <div>
          <h4 className="font-semibold text-lg mb-3">📝 Razões do Recurso</h4>
          <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">{appeal.razoes}</p>
        </div>

        {/* Botão para Julgar Recurso (se ainda não foi julgado) */}
        {appeal.status === "pendente" && (
          <Button
            onClick={() => julgarRecurso.mutate({ appealId: appeal.id })}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={julgarRecurso.isPending}
          >
            {julgarRecurso.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando votos dos desembargadores...</>
            ) : (
              <><Gavel className="h-4 w-4 mr-2" /> Solicitar Julgamento do Tribunal</>
            )}
          </Button>
        )}

        {/* Votos dos Desembargadores */}
        {appeal.status === "julgado" && judges && judges.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">⚖️ Votos dos Desembargadores</h4>
            <div className="space-y-4">
              {judges.map((judge: any, index: number) => (
                <Card key={judge.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">
                          {judge.nome} - {judge.cargo}
                        </CardTitle>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        judge.voto === 'manter' ? 'bg-green-100 text-green-800' :
                        judge.voto === 'reformar' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {judge.voto.toUpperCase()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Fundamentação:</p>
                    <div className="space-y-3">
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{judge.fundamentacao}</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary">
                            Ver Fundamentação Completa
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{judge.nome}</DialogTitle>
                            <DialogDescription className="flex items-center gap-2">
                              {judge.cargo} •
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                judge.voto === 'manter' ? 'bg-green-100 text-green-800' :
                                judge.voto === 'reformar' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {judge.voto.toUpperCase()}
                              </span>
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="bg-muted/50 p-4 rounded-lg border">
                              <pre className="text-sm whitespace-pre-wrap font-sans">{judge.fundamentacao}</pre>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Decisão Final e Ementa */}
        {appeal.status === "julgado" && appeal.decisao && (
          <div>
            <div className="text-center py-6 bg-primary/10 rounded-lg mb-4">
              <h3 className="text-3xl font-bold text-primary mb-2">
                {appeal.decisao === 'manter' && '✅ SENTENÇA MANTIDA'}
                {appeal.decisao === 'reformar' && '🔄 SENTENÇA REFORMADA'}
                {appeal.decisao === 'anular' && '❌ SENTENÇA ANULADA'}
              </h3>
              <p className="text-sm text-muted-foreground">Decisão por Maioria</p>
            </div>

            {appeal.ementa && (
              <div>
                <h4 className="font-semibold text-lg mb-3">📖 Ementa do Acórdão</h4>
                <p className="text-sm whitespace-pre-wrap bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-l-4 border-blue-500">
                  {appeal.ementa}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// Componente para galeria de documentos visuais
function DocumentosVisuaisGallery({ trialId }: { trialId: number }) {
  const { data: docs, isLoading } = trpc.enhancements.visualDocs.list.useQuery({ trialId });
  const generateDoc = trpc.enhancements.visualDocs.generate.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const categoryLabels: Record<string, string> = {
    cena_crime: "Cena do Crime",
    planta_baixa: "Planta Baixa",
    laudo_pericial: "Laudo Pericial",
    foto_prova: "Foto de Prova",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botões para gerar documentos */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateDoc.mutate({ trialId, category: "cena_crime" })}
          disabled={generateDoc.isPending}
        >
          {generateDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "📸"} Cena do Crime
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateDoc.mutate({ trialId, category: "planta_baixa" })}
          disabled={generateDoc.isPending}
        >
          {generateDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "🗺️"} Planta Baixa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateDoc.mutate({ trialId, category: "laudo_pericial" })}
          disabled={generateDoc.isPending}
        >
          {generateDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "📝"} Laudo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateDoc.mutate({ trialId, category: "foto_prova" })}
          disabled={generateDoc.isPending}
        >
          {generateDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "📷"} Foto de Prova
        </Button>
      </div>

      {/* Lista de documentos */}
      {docs && docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((doc: any) => (
            <Card key={doc.id} className="overflow-hidden">
              <div className="aspect-video relative bg-muted">
                <img
                  src={doc.fileUrl}
                  alt={doc.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-sm">{doc.title}</CardTitle>
                <CardDescription className="text-xs">
                  {categoryLabels[doc.category] || doc.category}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{doc.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  asChild
                >
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    Abrir em Nova Aba
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileStack className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum documento visual gerado ainda.</p>
          <p className="text-sm">Clique nos botões acima para gerar documentos com IA.</p>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar link para sessão de instância superior
function InstanciaSuperiorLink({ sessionId }: { sessionId: number }) {
  const { data: session } = trpc.session.getById.useQuery({ id: sessionId });
  const { data: childSessions } = trpc.session.getChildSessions.useQuery(
    { parentSessionId: sessionId },
    { enabled: !!sessionId }
  );

  if (!session || !childSessions || childSessions.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-500">
      <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">
        🔺 Instâncias Superiores
      </h4>
      <div className="space-y-2">
        {childSessions.map((child: any) => (
          <a
            key={child.id}
            href={`/julgamento/${child.id}`}
            className="block p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {child.instancia === 'segunda' && '🏛️ Segunda Instância - Tribunal de Justiça'}
                  {child.instancia === 'terceira' && '🏛️ Supremo Tribunal Federal (STF) — Sessão Plenária'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {child.status === 'em_andamento' ? 'Em andamento' : child.status === 'concluido' ? 'Concluído' : 'Abandonado'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-500" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Componente para mostrar resumo da instância anterior
function ResumoInstanciaAnterior({ appealId, instancia }: { appealId: number; instancia: string }) {
  const { data: appealData } = trpc.appeal.getById.useQuery(
    { appealId },
    { enabled: !!appealId }
  );

  if (!appealData) {
    return null;
  }

  const instanciaNome = instancia === 'segunda' ? '1ª Instância' : '2ª Instância';
  const decisaoLabel = {
    manter: '✅ Sentença Mantida',
    reformar: '🔄 Sentença Reformada',
    anular: '❌ Sentença Anulada'
  };

  return (
    <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Resumo da {instanciaNome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Decisão Anterior:</p>
          <p className="text-sm font-bold">{decisaoLabel[appealData.decisao as keyof typeof decisaoLabel]}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Tipo de Recurso:</p>
          <p className="text-sm">{appealData.tipo.charAt(0).toUpperCase() + appealData.tipo.slice(1)}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Recorrente:</p>
          <p className="text-sm">{appealData.recorrente.charAt(0).toUpperCase() + appealData.recorrente.slice(1)}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Razões do Recurso:</p>
          <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-800 whitespace-pre-wrap">
            {appealData.razoes}
          </p>
        </div>

        {appealData.ementa && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Ementa do Acórdão:</p>
            <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-800 whitespace-pre-wrap">
              {appealData.ementa}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para exibir feedback detalhado
function FeedbackContent({ sessionId }: { sessionId: number }) {
  const { data: feedback, isLoading, error } = trpc.session.getFeedback.useQuery(
    { sessionId },
    { retry: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Analisando sua performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive font-semibold mb-2">Erro ao gerar feedback</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!feedback) {
    return <p className="text-center text-muted-foreground py-8">Nenhum feedback disponível.</p>;
  }

  return (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="space-y-6">
        {/* Nota Final */}
        <div className="text-center py-6 bg-primary/10 rounded-lg">
          <h3 className="text-4xl font-bold text-primary mb-2">{feedback.notaFinal.toFixed(1)}/10</h3>
          <p className="text-sm text-muted-foreground">Nota Final</p>
        </div>

        {/* Comentário Geral */}
        {feedback.comentarioGeral && (
          <div>
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Comentário Geral
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{feedback.comentarioGeral}</p>
          </div>
        )}

        {/* Pontos Positivos */}
        {feedback.pontosPositivos && feedback.pontosPositivos.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-green-600 dark:text-green-400">✅ Pontos Positivos</h4>
            <ul className="space-y-2">
              {feedback.pontosPositivos.map((ponto: string, index: number) => (
                <li key={index} className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border-l-4 border-green-500">
                  {ponto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pontos Negativos */}
        {feedback.pontosNegativos && feedback.pontosNegativos.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-red-600 dark:text-red-400">❌ Pontos Negativos</h4>
            <ul className="space-y-2">
              {feedback.pontosNegativos.map((ponto: string, index: number) => (
                <li key={index} className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border-l-4 border-red-500">
                  {ponto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Jurisprudências Aplicáveis */}
        {feedback.jurisprudenciasAplicaveis && feedback.jurisprudenciasAplicaveis.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">📖 Jurisprudências que Você Deveria Ter Citado</h4>
            <ul className="space-y-2">
              {feedback.jurisprudenciasAplicaveis.map((juris: string, index: number) => (
                <li key={index} className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border-l-4 border-blue-500">
                  {juris}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leis que Faltaram */}
        {feedback.leisQueFaltaram && feedback.leisQueFaltaram.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-amber-600 dark:text-amber-400">⚖️ Leis e Artigos que Faltaram</h4>
            <ul className="space-y-2">
              {feedback.leisQueFaltaram.map((lei: string, index: number) => (
                <li key={index} className="text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border-l-4 border-amber-500">
                  {lei}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Como Melhorar */}
        {feedback.comoMelhorar && feedback.comoMelhorar.length > 0 && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-purple-600 dark:text-purple-400">💡 Como Melhorar</h4>
            <ul className="space-y-2">
              {feedback.comoMelhorar.map((dica: string, index: number) => (
                <li key={index} className="text-sm bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border-l-4 border-purple-500">
                  {dica}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

const roleLabels: Record<string, string> = {
  juiz: "Juiz",
  advogado_defesa: "Advogado de Defesa",
  defensor_publico: "Defensor Público",
  promotor: "Promotor",
  assistente_acusacao: "Assistente de Acusação",
  reu: "Réu",
  vitima: "Vítima",
  testemunha: "Testemunha",
  perito: "Perito",
  jurado: "Jurado Popular",
  desembargador: "Desembargador",
  ministro: "Ministro do STF",
  procurador_justica: "Procurador de Justiça",
  subprocurador_geral: "Subprocurador-Geral",
  sistema: "Sistema",
};

/** No STF os papéis da tribuna criminal recebem os cargos constitucionais
 * correspondentes. Fora do STF, os rótulos penais continuam corretos. */
function stfRoleLabel(role: string, isSTF: boolean): string {
  if (!isSTF) return roleLabels[role] || role;
  const stfLabels: Record<string, string> = {
    ministro: "Ministro do STF",
    promotor: "Procurador-Geral da República (PGR)",
    assistente_acusacao: "Advogado-Geral da União (AGU)",
    advogado_defesa: "Advogado da Tribuna",
    juiz: "Presidente do STF",
  };
  return stfLabels[role] || roleLabels[role] || role;
}

/** No Plenário, "procedente" é o voto favorável à tese e "improcedente" o
 * contrário. "Parcial" aparece à parte para não distorcer a maioria. */
const stfPositionLabels: Record<string, string> = {
  procedente: "Favorável",
  improcedente: "Contrário",
  parcial: "Parcial",
  indefinido: "Sem posição clara",
};

const roleStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  juiz: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100",
  },
  advogado_defesa: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-100",
    badge: "bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100",
  },
  defensor_publico: {
    bg: "bg-cyan-50 dark:bg-cyan-950",
    border: "border-cyan-300 dark:border-cyan-700",
    text: "text-cyan-900 dark:text-cyan-100",
    badge: "bg-cyan-200 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-100",
  },
  promotor: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-900 dark:text-red-100",
    badge: "bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100",
  },
  assistente_acusacao: {
    bg: "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-900 dark:text-orange-100",
    badge: "bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100",
  },
  reu: {
    bg: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-100",
    badge: "bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-100",
  },
  vitima: {
    bg: "bg-pink-50 dark:bg-pink-950",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-900 dark:text-pink-100",
    badge: "bg-pink-200 dark:bg-pink-800 text-pink-900 dark:text-pink-100",
  },
  testemunha: {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-900 dark:text-green-100",
    badge: "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100",
  },
  perito: {
    bg: "bg-teal-50 dark:bg-teal-950",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-900 dark:text-teal-100",
    badge: "bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100",
  },
  jurado: {
    bg: "bg-indigo-50 dark:bg-indigo-950",
    border: "border-indigo-300 dark:border-indigo-700",
    text: "text-indigo-900 dark:text-indigo-100",
    badge: "bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100",
  },
  desembargador: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-900 dark:text-yellow-100",
    badge: "bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100",
  },
  ministro: {
    bg: "bg-violet-50 dark:bg-violet-950",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-900 dark:text-violet-100",
    badge: "bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100",
  },
  procurador_justica: {
    bg: "bg-rose-50 dark:bg-rose-950",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-900 dark:text-rose-100",
    badge: "bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100",
  },
  subprocurador_geral: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950",
    border: "border-fuchsia-300 dark:border-fuchsia-700",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
    badge: "bg-fuchsia-200 dark:bg-fuchsia-800 text-fuchsia-900 dark:text-fuchsia-100",
  },
  sistema: {
    bg: "bg-gray-50 dark:bg-gray-950",
    border: "border-gray-300 dark:border-gray-700",
    text: "text-gray-900 dark:text-gray-100",
    badge: "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
  },
};

export default function Trial() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id || "0");
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showVoteTally, setShowVoteTally] = useState(false);
  const [showFinalDecision, setShowFinalDecision] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading } = trpc.session.getById.useQuery(
    { id: sessionId },
    {
      enabled: !!sessionId && isAuthenticated,
      refetchInterval: (query) =>
        query.state.data?.status === 'em_andamento' ? 5000 : false,
    }
  );

  const { data: trial, isLoading: trialLoading } = trpc.trial.getById.useQuery(
    { id: session?.trialId || 0 },
    { enabled: !!session?.trialId }
  );

  const { data: messages, refetch: refetchMessages } = trpc.message.list.useQuery(
    { sessionId },
    {
      enabled: !!sessionId && isAuthenticated,
      refetchInterval: false,
    }
  );

  const { data: evidences } = trpc.evidence.list.useQuery(
    { trialId: session?.trialId || 0 },
    { enabled: !!session?.trialId }
  );

  const { data: participants } = trpc.participant.list.useQuery(
    { sessionId },
    { enabled: !!sessionId && isAuthenticated }
  );

  // A instância é a fonte autoritativa: sessões STF antigas podem não ter a
  // área "stf_constitucional" preenchida.
  const isSTF =
    session?.instancia === 'terceira' ||
    session?.userRole === 'ministro' ||
    trial?.area === 'stf_constitucional';

  const { data: vehicleHistory } = trpc.vehicleHistory.list.useQuery(
    { trialId: session?.trialId || 0 },
    { enabled: !!session?.trialId && trial?.area === "veiculos_sinistros" }
  );

  const { data: documents } = trpc.document.list.useQuery(
    { trialId: session?.trialId || 0 },
    { enabled: !!session?.trialId }
  );

  const { data: juryVotes } = trpc.juryVote.list.useQuery(
    { sessionId },
    { enabled: !!sessionId && isAuthenticated }
  );

  const { data: stfTally, refetch: refetchStfTally } = trpc.message.stfTally.useQuery(
    { sessionId },
    {
      enabled: !!sessionId && isAuthenticated && isSTF,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data || session?.status === 'concluido') return false;
        return data.tally.total >= data.totalSeats ? false : 4000;
      },
    }
  );

  useEffect(() => {
    if (isSTF) void refetchStfTally();
  }, [messages?.length, isSTF, refetchStfTally]);

  const sendMutation = trpc.message.send.useMutation({
    onSuccess: () => {
      setMessage("");
      setIsSending(false);
      refetchMessages();
      setTimeout(() => {
        refetchMessages();
      }, 500);
      setTimeout(() => {
        refetchMessages();
      }, 1000);
    },
    onError: (error) => {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem. Tente novamente.");
      setIsSending(false);
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    sendMutation.mutate({
      sessionId,
      content: message.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const continuarJulgamento = trpc.message.continuar.useMutation({
    onSuccess: () => {
      refetchMessages();
      setTimeout(() => {
        refetchMessages();
      }, 500);
      setTimeout(() => {
        refetchMessages();
      }, 1000);
    },
    onError: (error) => {
      console.error("Erro ao continuar julgamento:", error);
      const errorMessage = error.message || "Erro ao continuar julgamento. Tente novamente.";
      alert(errorMessage);
      refetchMessages();
    },
  });

  const proclamarMutation = trpc.message.proclamar.useMutation({
    onSuccess: () => {
      refetchMessages();
      setTimeout(() => refetchMessages(), 500);
    },
    onError: (error: any) => {
      alert(error.message || "Erro ao proclamar o resultado.");
    },
  });

  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleContinuarJulgamento = () => {
    if (isDebouncing || continuarJulgamento.isPending) {
      return;
    }

    setIsDebouncing(true);
    continuarJulgamento.mutate({ sessionId });

    setTimeout(() => {
      setIsDebouncing(false);
    }, 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (authLoading || sessionLoading || trialLoading) {
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
              Você precisa estar autenticado para acessar esta sessão.
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

  if (!session || !trial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sessão Não Encontrada</CardTitle>
            <CardDescription>
              A sessão solicitada não existe ou você não tem permissão para acessá-la.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Header Compacto */}
      <header className="border-b bg-card shrink-0 p-3">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Scale className="h-5 w-5 text-primary shrink-0" />
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold truncate">{APP_TITLE}</h1>
                <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${
                  session.instancia === 'terceira' || trial?.area === 'stf_constitucional'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm'
                    : session.instancia === 'segunda'
                    ? 'bg-blue-500'
                    : 'bg-green-600'
                }`}>
                  {session.instancia === 'terceira' || trial?.area === 'stf_constitucional'
                    ? '🏛️ STF Plenário'
                    : session.instancia === 'segunda'
                    ? '2ª Instância'
                    : '1ª Instância'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                Você: <span className="font-semibold text-foreground">{roleLabels[session.userRole]}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Menu Secundário (Drawer/Dropdown) */}
      {isMenuOpen && (
        <div className="absolute top-12 right-3 z-50 w-64 bg-card border rounded-lg shadow-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Opções do Julgamento</div>
          <div className="grid grid-cols-1 gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                  <FileStack className="h-4 w-4" /> Documentos
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Documentos Visuais do Caso</DialogTitle>
                  <DialogDescription>Fotos, plantas baixas, laudos e outros documentos gerados por IA</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <DocumentosVisuaisGallery trialId={trial.id} />
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                  <Clock className="h-4 w-4" /> Histórico de Audiências
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>📅 Histórico de Audiências</DialogTitle>
                  <DialogDescription>Audiências anteriores realizadas neste caso</DialogDescription>
                </DialogHeader>
                <HearingHistoryView trialId={trial?.id || 0} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 w-full"
              onClick={() => {
                setIsMenuOpen(false);
                setShowFinalDecision(true);
              }}
            >
              <Gavel className="h-4 w-4" /> Decisão Final
            </Button>
            {trial?.admiteJuri && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                    <Gavel className="h-4 w-4" /> Votos do Júri
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Votos do Júri Popular</DialogTitle>
                    <DialogDescription>Opiniões fundamentadas de cada jurado</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    {juryVotes && juryVotes.length > 0 ? (
                      <div className="space-y-4">
                        {juryVotes.map((vote: any, index: number) => (
                          <Card key={vote.id} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <CardTitle className="text-base md:text-lg">
                                    {index + 1}. {vote.jurorName}
                                  </CardTitle>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
                                  vote.vote === 'culpado' ? 'bg-red-100 text-red-800' :
                                  vote.vote === 'inocente' ? 'bg-green-100 text-green-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {vote.vote === 'culpado' ? 'CULPADO' : vote.vote === 'inocente' ? 'INOCENTE' : 'ABSOLVIÇÃO'}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Opinião:</p>
                              <p className="text-sm whitespace-pre-wrap">{vote.opinion}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Nenhum voto disponível.</p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                  <Hammer className="h-4 w-4" /> Interpor Recurso
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>⚖️ Interpor Recurso</DialogTitle>
                  <DialogDescription>Apresente suas razões para a segunda instância</DialogDescription>
                </DialogHeader>
                <InterporRecursoForm sessionId={sessionId} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                  <Gavel className="h-4 w-4" /> Ver Acórdão
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>⚖️ Acórdão - Tribunal de Justiça</DialogTitle>
                  <DialogDescription>Decisão colegiada dos desembargadores</DialogDescription>
                </DialogHeader>
                <AcordaoView sessionId={sessionId} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full">
                  <MessageSquareText className="h-4 w-4" /> Solicitar Feedback
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>🎯 Feedback Performance</DialogTitle>
                  <DialogDescription>Análise detalhada da sua atuação</DialogDescription>
                </DialogHeader>
                <FeedbackContent sessionId={sessionId} />
              </DialogContent>
            </Dialog>
            <div className="pt-2 border-t">
              <Link href="/" className="block text-center text-xs text-destructive hover:underline">
                Sair da Sessão
              </Link>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showFinalDecision} onOpenChange={setShowFinalDecision}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>⚖️ Decisão Final do Julgamento</DialogTitle>
            <DialogDescription>Sentença fundamentada completa com veredicto</DialogDescription>
          </DialogHeader>
          <FinalDecisionView sessionId={sessionId} userRole={session?.userRole || ''} isSTF={isSTF} />
        </DialogContent>
      </Dialog>

      {/* Barra de Ações Principais (Sempre Visível) */}
      <div className="bg-card border-b shrink-0 px-3 py-2">
        <div className="container mx-auto flex justify-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs px-3">
                <FileText className="h-3 w-3" /> Provas
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Provas do Caso</DialogTitle>
                <DialogDescription>Documentos e evidências apresentadas</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                {evidences && evidences.length > 0 ? (
                  <div className="space-y-4">
                    {evidences.map((evidence, idx) => (
                      <Card key={evidence.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                              Prova {idx + 1}
                            </span>
                            {evidence.title}
                          </CardTitle>
                          <CardDescription className="uppercase text-xs">
                            Tipo: {evidence.type}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <h5 className="font-semibold text-sm mb-1">Descrição</h5>
                            <p className="text-sm text-muted-foreground">{evidence.description}</p>
                          </div>
                          {evidence.details && (
                            <div>
                              <h5 className="font-semibold text-sm mb-1">Detalhes Técnicos</h5>
                              <Streamdown>{evidence.details}</Streamdown>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma prova disponível.</p>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs px-3">
                <Info className="h-3 w-3" /> Detalhes
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{trial.title}</DialogTitle>
                <DialogDescription className="uppercase text-xs font-semibold">
                  {trial.area}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição do Caso</h4>
                    <Streamdown>{trial.description}</Streamdown>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fatos</h4>
                    <Streamdown>{trial.facts}</Streamdown>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fundamentação Legal</h4>
                    <Streamdown>{trial.legalBasis}</Streamdown>
                  </div>
                  {trial.jurisprudence && (
                    <div>
                      <h4 className="font-semibold mb-2">Jurisprudência</h4>
                      <Streamdown>{trial.jurisprudence}</Streamdown>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs px-3">
                <Users className="h-3 w-3" /> Pessoas
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Participantes do Tribunal</DialogTitle>
                <DialogDescription>Pessoas envolvidas nesta sessão</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                {participants && participants.length > 0 ? (
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <Card key={participant.id} className={participant.isUser ? "border-primary" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{participant.name}</CardTitle>
                            {participant.isUser ? (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">Você</span>
                            ) : (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">IA</span>
                            )}
                          </div>
                          <CardDescription className="text-xs uppercase font-semibold">
                            {roleLabels[participant.role] || participant.role}
                          </CardDescription>
                        </CardHeader>
                        {participant.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{participant.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Carregando participantes...</p>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden bg-muted/30 relative">
        <div className="h-full flex flex-col max-w-5xl mx-auto">
          {/* Resumo do Caso Anterior (apenas para instâncias superiores) */}
          {(session.instancia === 'segunda' || session.instancia === 'terceira') && session.appealId && (
            <div className="shrink-0 p-3">
              <ResumoInstanciaAnterior appealId={session.appealId} instancia={session.instancia} />
            </div>
          )}

          {/* Placar e Contexto do Plenário do STF */}
          {isSTF && (
            <div className="shrink-0 bg-gradient-to-r from-purple-900/15 via-indigo-900/10 to-purple-900/15 border-b border-purple-200 dark:border-purple-800/50 px-3 py-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-purple-950 dark:text-purple-200">
                  <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate">Supremo Tribunal Federal • Sessão Plenária</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-purple-800 dark:text-purple-300">
                  <span className="bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full font-mono font-medium">
                    11 Cadeiras · 10 IA + você
                  </span>
                  <span className="bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full font-mono font-medium">
                    Maioria: 6 votos
                  </span>
                  {participants?.some(p => p.role === "promotor") && (
                    <span className="hidden sm:inline">PGR na Tribuna</span>
                  )}
                  {participants?.some(p => p.role === "assistente_acusacao") && (
                    <span className="hidden lg:inline">AGU na Tribuna</span>
                  )}
                </div>
              </div>

              {/* Contagem compacta: só favoráveis e contrários no banner */}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-purple-950 dark:text-purple-200">Apuração:</span>
                  <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full font-mono font-medium">
                    ✅ {stfTally?.tally.procedente ?? 0} favoráveis
                  </span>
                  <span className="bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-full font-mono font-medium">
                    ❌ {stfTally?.tally.improcedente ?? 0} contrários
                  </span>
                  {(stfTally?.tally.parcial ?? 0) > 0 && (
                    <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-mono font-medium">
                      ⚖️ {stfTally?.tally.parcial} parciais
                    </span>
                  )}
                  <span className="text-purple-700 dark:text-purple-300 font-mono">
                    {stfTally?.tally.total ?? 0}/{stfTally?.totalSeats ?? 11} manifestados
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] shrink-0 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/60"
                  onClick={() => setShowVoteTally(true)}
                >
                  Ver votos
                </Button>
              </div>
            </div>
          )}

          <Dialog open={showVoteTally} onOpenChange={setShowVoteTally}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Apuração de votos</DialogTitle>
                <DialogDescription>
                  Contagem provisória do Plenário. A proclamação do acórdão é feita pelo Presidente.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Favoráveis</div>
                  <div className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{stfTally?.tally.procedente ?? 0}</div>
                </div>
                <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300">Contrários</div>
                  <div className="text-lg font-semibold text-rose-800 dark:text-rose-200">{stfTally?.tally.improcedente ?? 0}</div>
                </div>
                <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Parciais</div>
                  <div className="text-lg font-semibold text-amber-800 dark:text-amber-200">{stfTally?.tally.parcial ?? 0}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{stfTally?.tally.total ?? 0} de {stfTally?.totalSeats ?? 11} cadeiras manifestadas</span>
                  <span>Maioria: {stfTally?.majority ?? 6}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600 dark:bg-purple-400 transition-all"
                    style={{ width: `${Math.min(100, ((stfTally?.tally.total ?? 0) / (stfTally?.totalSeats || 11)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {stfTally?.votes?.length ? stfTally.votes.map((vote, index) => (
                  <div key={`${vote.ministerName}-${index}`} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
                    <span className="truncate font-medium">
                      {vote.ministerName}{vote.isUser ? " (você)" : ""}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {stfPositionLabels[vote.position] || vote.position} · {vote.origin}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum voto apurado ainda. Use [VOTO] ou [DIVERGÊNCIA] ao se manifestar.
                  </p>
                )}
              </div>

              {stfTally?.tally.majorityReached && (
                <p className="text-xs font-semibold text-purple-800 dark:text-purple-200">
                  Maioria formada: {stfPositionLabels[stfTally.tally.winningPosition] || stfTally.tally.winningPosition}.
                </p>
              )}
            </DialogContent>
          </Dialog>

          {/* Messages Area - OCUPA O RESTO DA TELA */}
          <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollRef}>
            <div className="space-y-4 p-3 pb-24">
              {messages?.map((msg) => {
                const isUser = !msg.isAI;
                const isSystem = msg.role === "sistema";
                // senderName é a fonte autoritativa: no STF vários participantes têm role "ministro"
                // e o find por role acabava sempre retornando o participante do usuário.
                const displayNameBase = msg.senderName?.trim()
                  || participants?.find(p => !p.isUser && p.role === msg.role)?.name;
                const roleText = stfRoleLabel(msg.role, isSTF);
                const displayName = displayNameBase
                  ? `${displayNameBase} [${roleText}]`
                  : roleText;
                const styles = roleStyles[msg.role] || roleStyles.sistema;

                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg border ${
                      isSystem
                        ? "bg-muted text-muted-foreground text-center w-full max-w-full border-muted"
                        : isUser
                        ? "bg-primary text-primary-foreground border-primary"
                        : `${styles.bg} ${styles.border} ${styles.text}`
                    }`}>
                      {!isSystem && (
                        <div className={`font-semibold text-xs mb-2 px-4 py-2 rounded-t-md ${
                          isUser ? "bg-primary/80" : styles.badge
                        }`}>
                          {displayName}
                          {msg.isAI && <span className="text-xs opacity-70 font-normal ml-1">(IA)</span>}
                        </div>
                      )}
                      <div className={`prose prose-sm max-w-none dark:prose-invert px-4 whitespace-pre-wrap break-words ${
                        isSystem ? "" : "pb-3"
                      }`}>
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-lg p-4 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Aguardando resposta...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Composer Area - FIXO NA BASE */}
          <div className="shrink-0 p-3 bg-card border-t space-y-3">
            {/* Turn Indicator Compacto */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-center">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                {isSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> IA respondendo...
                  </span>
                ) : (
                  <span>✓ Sua vez: <strong>{stfRoleLabel(session.userRole, isSTF)}</strong></span>
                )}
              </p>
            </div>

            {/* Ações Rápidas de Plenário / Ministro */}
            {(session.userRole === "ministro" || trial?.area === "stf_constitucional") ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 border-violet-400 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900 shrink-0 font-medium"
                  onClick={() => setMessage((prev) => prev ? `[PEDIDO DE APARTE]: Permite um breve aparte, Excelência? ${prev}` : `[PEDIDO DE APARTE]: Permite um breve aparte, eminente colega? `)}
                >
                  ✋ Pedir Aparte
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 border-violet-400 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900 shrink-0 font-medium"
                  onClick={() => setMessage(`[PEDIDO DE VISTA]: Peço vista dos autos para exame mais aprofundado da matéria constitucional.`)}
                >
                  📖 Pedir Vista
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 shrink-0 font-medium"
                  onClick={() => setMessage((prev) => `[VOTO]: Acompanho integralmente o voto condutor do eminente Ministro Relator. ${prev}`)}
                >
                  ✅ Acompanhar Relator
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 border-rose-400 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 shrink-0 font-medium"
                  onClick={() => setMessage((prev) => `[DIVERGÊNCIA]: Peço vênia ao eminente Relator para inaugurar a divergência, no sentido de... ${prev}`)}
                >
                  ⚖️ Abrir Divergência
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 border-amber-400 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 shrink-0 font-medium"
                  onClick={() => setMessage((prev) => `[PROPOSTA DE TESE]: Proponho a fixação da seguinte tese com repercussão geral: "${prev}"`)}
                >
                  📜 Propor Tese
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={proclamarMutation.isPending || session?.status === 'concluido'}
                  className="h-7 text-[11px] px-2.5 py-0 border-fuchsia-500 dark:border-fuchsia-700 bg-fuchsia-100/70 dark:bg-fuchsia-950/50 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900 shrink-0 font-semibold"
                  onClick={() => proclamarMutation.mutate({ sessionId })}
                >
                  {proclamarMutation.isPending ? '⏳ Proclamando...' : '🏛️ Proclamar Resultado'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 shrink-0"
                  onClick={() => setMessage((prev) => prev ? `Objeção, Excelência! ${prev}` : `Objeção, Excelência! `)}
                >
                  ⚡ Objeção, Excelência!
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 py-0 shrink-0"
                  onClick={() => setMessage((prev) => prev ? `Pela ordem, Excelência: ${prev}` : `Pela ordem, Excelência: `)}
                >
                  📢 Pela Ordem
                </Button>
              </div>
            )}

            {/* Composer Compacto */}
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder={`Mensagem como ${roleLabels[session.userRole]}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="flex-1 min-h-[48px] max-h-[120px] resize-none py-2 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                size="icon"
                className="h-[48px] w-[48px] shrink-0"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>

            {/* Continuar Julgamento Compacto */}
            <div className="flex flex-col gap-1">
              {session.verdict ? (
                <Button
                  variant="default"
                  className="w-full h-9 gap-2 bg-green-600 hover:bg-green-700 text-sm"
                  onClick={() => setShowFinalDecision(true)}
                >
                  <Gavel className="h-4 w-4" /> Ver Decisão Final
                </Button>
              ) : (
                <Button
                  onClick={handleContinuarJulgamento}
                  disabled={continuarJulgamento.isPending || isDebouncing}
                  variant="outline"
                  className="w-full h-9 gap-2 text-sm"
                >
                  {continuarJulgamento.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><PlayCircle className="h-4 w-4" /> Continuar Julgamento</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
