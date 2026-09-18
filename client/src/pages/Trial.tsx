import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Loader2, ArrowLeft, Send, Info, FileText, Users, Car, FileStack, Gavel, MessageSquareText, Hammer, PlayCircle, Clock, ChevronRight } from "lucide-react";
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
import VoiceRecorder from "@/components/VoiceRecorder";

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
    <ScrollArea className="max-h-[60vh] pr-4">
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
                    <p className="text-sm whitespace-pre-wrap">{judge.fundamentacao}</p>
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
  // Sempre chamar hooks na mesma ordem, sem condições
  const { data: session } = trpc.session.get.useQuery({ id: sessionId });
  const { data: childSessions } = trpc.session.getChildSessions.useQuery(
    { parentSessionId: sessionId },
    { enabled: !!sessionId }
  );
  
  // Retornar null após todos os hooks serem chamados
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
                  {child.instancia === 'terceira' && '🏛️ Terceira Instância - Superior Tribunal de Justiça'}
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
  const { data: appeal, isLoading } = trpc.appeal.get.useQuery(
    { sessionId: 0 }, // Não usado, vamos buscar por appealId diretamente
    { enabled: false }
  );

  // Buscar recurso por ID usando uma query customizada
  const { data: appealData } = trpc.appeal.getById.useQuery(
    { appealId },
    { enabled: !!appealId }
  );

  if (isLoading || !appealData) {
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
  ministro: "Ministro",
  procurador_justica: "Procurador de Justiça",
  subprocurador_geral: "Subprocurador-Geral",
  sistema: "Sistema",
};

// Cores e estilos únicos para cada papel
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
    badge: "bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100",
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
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading } = trpc.session.getById.useQuery(
    { id: sessionId },
    { enabled: !!sessionId && isAuthenticated }
  );

  const { data: trial, isLoading: trialLoading } = trpc.trial.getById.useQuery(
    { id: session?.trialId || 0 },
    { enabled: !!session?.trialId }
  );

  const { data: messages, refetch: refetchMessages } = trpc.message.list.useQuery(
    { sessionId },
    { 
      enabled: !!sessionId && isAuthenticated,
      refetchInterval: false, // Usuário controla ritmo com botão "Continuar Julgamento"
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
      refetchMessages(); // Atualizar mensagens mesmo em caso de erro
    },
  });

  // Debounce para evitar cliques múltiplos rápidos
  const [isDebouncing, setIsDebouncing] = useState(false);
  
  const handleContinuarJulgamento = () => {
    if (isDebouncing || continuarJulgamento.isPending) {
      console.log("[DEBUG] Clique ignorado - debounce ativo ou requisição em andamento");
      return;
    }
    
    setIsDebouncing(true);
    continuarJulgamento.mutate({ sessionId });
    
    // Liberar após 2 segundos
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold">{APP_TITLE}</h1>
                {/* Badge de Instância */}
                {session.instancia === 'segunda' && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                    2ª Instância
                  </span>
                )}
                {session.instancia === 'terceira' && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                    3ª Instância
                  </span>
                )}
                {(!session.instancia || session.instancia === 'primeira') && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full">
                    1ª Instância
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Você é: <span className="font-semibold text-foreground">{roleLabels[session.userRole]}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-2 items-center">
            <ThemeSelector />
            
            {/* Botão Ver Documentos Visuais */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <FileStack className="h-4 w-4" /> <span className="hidden sm:inline">Ver Documentos</span><span className="sm:hidden">Docs</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Documentos Visuais do Caso</DialogTitle>
                  <DialogDescription>
                    Fotos, plantas baixas, laudos e outros documentos gerados por IA
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <DocumentosVisuaisGallery trialId={trial.id} />
                </ScrollArea>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <Info className="h-4 w-4" /> <span className="hidden sm:inline">Detalhes do Caso</span><span className="sm:hidden">Detalhes</span>
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

            {/* Botão de Provas */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <FileText className="h-4 w-4" /> Provas
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Provas do Caso</DialogTitle>
                  <DialogDescription>
                    Documentos, testemunhos e outras evidências apresentadas
                  </DialogDescription>
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
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma prova disponível para este caso.
                    </p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Botão de Participantes */}
            <Dialog>
              <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                    <Users className="h-4 w-4" /> <span className="hidden sm:inline">Participantes</span><span className="sm:hidden">Pessoas</span>
                  </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Participantes do Tribunal</DialogTitle>
                  <DialogDescription>
                    Pessoas envolvidas nesta sessão de julgamento
                  </DialogDescription>
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
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                  Você
                                </span>
                              ) : (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                  IA
                                </span>
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
                    <p className="text-center text-muted-foreground py-8">
                      Carregando participantes...
                    </p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Botão de Documentos */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <FileStack className="h-4 w-4" /> <span className="hidden sm:inline">Documentos</span><span className="sm:hidden">Docs</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Documentos do Caso</DialogTitle>
                  <DialogDescription>
                    Contratos, laudos, certidões, boletins e outros documentos para investigação
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {documents && documents.length > 0 ? (
                    <div className="space-y-4">
                      {documents.map((doc: any, index: number) => (
                        <Card key={doc.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-base md:text-lg">
                                  {index + 1}. {doc.title}
                                </CardTitle>
                                <CardDescription className="mt-1 text-xs md:text-sm">
                                  <span className="font-semibold">Tipo:</span> {doc.type} | <span className="font-semibold">Emitido por:</span> {doc.issuer} | <span className="font-semibold">Data:</span> {new Date(doc.issueDate).toLocaleDateString('pt-BR')}
                                </CardDescription>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                doc.relevance === 'alta' ? 'bg-red-100 text-red-800' :
                                doc.relevance === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.relevance === 'alta' ? 'Alta' : doc.relevance === 'media' ? 'Média' : 'Baixa'} Relevância
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-1">Descrição:</p>
                              <p className="text-sm">{doc.description}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Conteúdo Completo do Documento:</p>
                              <div className="bg-muted/50 p-4 rounded-lg border">
                                <pre className="text-xs md:text-sm whitespace-pre-wrap font-mono">{doc.content}</pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum documento disponível para este caso.</p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Botão de Histórico do Veículo (apenas para casos de veículos/sinistros) */}
            {trial?.area === "veiculos_sinistros" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                    <Car className="h-4 w-4" /> <span className="hidden sm:inline">Histórico do Veículo</span><span className="sm:hidden">Histórico</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Histórico Completo do Veículo</DialogTitle>
                    <DialogDescription>
                      Manutenções, perícias, trocas de peças e eventos relacionados ao veículo
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    {vehicleHistory && vehicleHistory.length > 0 ? (
                      <div className="space-y-4">
                        {vehicleHistory.map((event, idx) => (
                          <Card key={event.id} className="border-l-4 border-l-primary">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                                      {new Date(event.eventDate).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="capitalize">{event.eventType.replace('_', ' ')}</span>
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {event.location} • {event.mileage?.toLocaleString('pt-BR')} km
                                  </CardDescription>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  {event.cost}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div>
                                <h5 className="font-semibold text-sm mb-1">Descrição</h5>
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              </div>
                              {event.parts && (
                                <div>
                                  <h5 className="font-semibold text-sm mb-1">Peças Envolvidas</h5>
                                  <p className="text-sm text-muted-foreground">{event.parts}</p>
                                </div>
                              )}
                              {event.technician && (
                                <div>
                                  <h5 className="font-semibold text-sm mb-1">Responsável</h5>
                                  <p className="text-sm text-muted-foreground">{event.technician}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Carregando histórico do veículo...
                      </p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}

            {/* Botão de Solicitar Votação do Júri (apenas para juiz em casos que admitem júri) */}
            {session?.userRole === 'juiz' && trial?.admiteJuri && !session?.juriVotou && (
              <SolicitarVotacaoButton sessionId={sessionId} />
            )}

            {/* Botão de Histórico de Audiências */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <Clock className="h-4 w-4" /> <span className="hidden sm:inline">Histórico de Audiências</span><span className="sm:hidden">Audiências</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>📅 Histórico de Audiências</DialogTitle>
                  <DialogDescription>
                    Audiências anteriores realizadas neste caso, incluindo resumos e decisões intermediárias
                  </DialogDescription>
                </DialogHeader>
                <HearingHistoryView trialId={trial?.id || 0} />
              </DialogContent>
            </Dialog>

            {/* Botão de Decisão Final */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <Gavel className="h-4 w-4" /> <span className="hidden sm:inline">Decisão Final</span><span className="sm:hidden">Decisão</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>⚖️ Decisão Final do Julgamento</DialogTitle>
                  <DialogDescription>
                    Sentença fundamentada completa com veredicto, valores de indenização e recursos cabíveis
                  </DialogDescription>
                </DialogHeader>
                <FinalDecisionView sessionId={sessionId} userRole={session?.userRole || ''} />
              </DialogContent>
            </Dialog>

            {/* Botão de Votos do Júri (só aparece se o caso admite júri) */}
            {trial?.admiteJuri && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4">
                  <Gavel className="h-4 w-4" /> <span className="hidden sm:inline">Votos do Júri</span><span className="sm:hidden">Júri</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Votos do Júri Popular</DialogTitle>
                  <DialogDescription>
                    Opiniões fundamentadas de cada jurado sobre o caso
                  </DialogDescription>
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
                    <p className="text-center text-muted-foreground py-8">Nenhum voto disponível para este caso.</p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
            )}

            {/* Botão de Interpor Recurso */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4 bg-orange-600 hover:bg-orange-700">
                  <Hammer className="h-4 w-4" /> <span className="hidden sm:inline">Interpor Recurso</span><span className="sm:hidden">Recurso</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>⚖️ Interpor Recurso - Segunda Instância</DialogTitle>
                  <DialogDescription>
                    Apresente suas razões para que o Tribunal de Justiça analise questões de direito
                  </DialogDescription>
                </DialogHeader>
                <InterporRecursoForm sessionId={sessionId} />
              </DialogContent>
            </Dialog>

            {/* Botão de Ver Acórdão */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4 bg-blue-600 hover:bg-blue-700">
                  <Gavel className="h-4 w-4" /> <span className="hidden sm:inline">Ver Acórdão</span><span className="sm:hidden">Acórdão</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>⚖️ Acórdão - Tribunal de Justiça</DialogTitle>
                  <DialogDescription>
                    Decisão colegiada dos desembargadores sobre o recurso interposto
                  </DialogDescription>
                </DialogHeader>
                <AcordaoView sessionId={sessionId} />
              </DialogContent>
            </Dialog>

            {/* Link para Instância Superior (se existir) */}
            <InstanciaSuperiorLink sessionId={sessionId} />

            {/* Botão de Solicitar Feedback */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 min-h-[44px] text-sm md:text-base px-4 bg-green-600 hover:bg-green-700">
                  <MessageSquareText className="h-4 w-4" /> <span className="hidden sm:inline">Solicitar Feedback</span><span className="sm:hidden">Feedback</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>🎯 Feedback da Sua Performance</DialogTitle>
                  <DialogDescription>
                    Análise detalhada da sua atuação como {roleLabels[session.userRole]}
                  </DialogDescription>
                </DialogHeader>
                <FeedbackContent sessionId={sessionId} />
              </DialogContent>
            </Dialog>
            
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 min-h-[44px] px-4">
                <ArrowLeft className="h-4 w-4" /> Sair
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-muted/30">
        <div className="container flex-1 flex flex-col py-6 max-w-5xl">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Sessão de Julgamento</CardTitle>
              <CardDescription>{trial.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Resumo do Caso Anterior (apenas para instâncias superiores) */}
              {(session.instancia === 'segunda' || session.instancia === 'terceira') && session.appealId && (
                <ResumoInstanciaAnterior appealId={session.appealId} instancia={session.instancia} />
              )}
              {/* Messages Area */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages?.map((msg) => {
                    const isUser = !msg.isAI;
                    const isSystem = msg.role === "sistema";
                    
                    // Buscar nome do participante
                    const participant = participants?.find(p => p.role === msg.role);
                    const displayName = participant?.name 
                      ? `${participant.name} [${roleLabels[msg.role] || msg.role}]`
                      : (roleLabels[msg.role] || msg.role);
                    
                    // Obter estilos do papel
                    const styles = roleStyles[msg.role] || roleStyles.sistema;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg border ${
                            isSystem
                              ? "bg-muted text-muted-foreground text-center w-full max-w-full border-muted"
                              : isUser
                              ? "bg-primary text-primary-foreground border-primary"
                              : `${styles.bg} ${styles.border} ${styles.text}`
                          }`}
                        >
                          {!isSystem && (
                            <div className={`font-semibold text-xs mb-2 px-4 py-2 rounded-t-md ${
                              isUser
                                ? "bg-primary/80"
                                : styles.badge
                            }`}>
                              {displayName}
                              {msg.isAI && (
                                <span className="text-xs opacity-70 font-normal ml-1">(IA)</span>
                              )}
                            </div>
                          )}
                          <div className={`prose prose-sm max-w-none dark:prose-invert px-4 ${
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
                        <span className="text-sm text-muted-foreground">
                          Aguardando resposta...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Indicador de Turnos Visuais */}
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aguardando resposta da IA...
                    </span>
                  ) : (
                    <span>
                      ✓ É sua vez de falar como <strong>{roleLabels[session.userRole]}</strong>
                    </span>
                  )}
                </p>
              </div>

              {/* Toggle Texto/Voz */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <span className="text-sm font-medium">Modo de Entrada:</span>
                <div className="flex gap-2">
                  <Button
                    variant={voiceMode ? "outline" : "default"}
                    size="sm"
                    onClick={() => setVoiceMode(false)}
                  >
                    📝 Texto
                  </Button>
                  <Button
                    variant={voiceMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceMode(true)}
                  >
                    🎤️ Voz
                  </Button>
                </div>
              </div>

              {/* Input Area */}
              {voiceMode ? (
                <div className="flex justify-center py-4">
                  <VoiceRecorder
                    sessionId={session.id}
                    onMessageSent={() => {
                      window.location.reload();
                    }}
                  />
                </div>
              ) : (
              <div className="flex flex-wrap gap-2 md:gap-2 items-center">
                <Textarea
                  placeholder={`Digite sua mensagem como ${roleLabels[session.userRole]}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  className="min-h-[80px] resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isSending}
                  size="icon"
                  className="h-[60px] w-[50px] sm:h-[80px] sm:w-[80px] shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              )}

              <div className="flex flex-col gap-2">
                {session.status === 'concluido' && session.verdict ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full gap-2 bg-green-600 hover:bg-green-700">
                        <Gavel className="h-4 w-4" /> Ver Decisão Final
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>⚖️ Sentença Final</DialogTitle>
                        <DialogDescription>
                          Decisão proferida pelo juiz
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{session.verdict}</Streamdown>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <>
                    <Button
                      onClick={handleContinuarJulgamento}
                      disabled={continuarJulgamento.isPending || isDebouncing}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {continuarJulgamento.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando resposta...</>
                      ) : (
                        <><PlayCircle className="h-4 w-4" /> Continuar Julgamento</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Pressione Enter para enviar, Shift+Enter para nova linha
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
