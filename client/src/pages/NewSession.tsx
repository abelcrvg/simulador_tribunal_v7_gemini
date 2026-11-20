import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Loader2, ArrowLeft } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "juiz" | "advogado_defesa" | "promotor" | "testemunha" | "perito" | "jurado" | "reu" | "vitima" | "assistente_acusacao" | "defensor_publico" | "ministro";

const roles: { value: Role; label: string; description: string }[] = [
  { value: "ministro", label: "🏛️ Ministro do STF", description: "Debata no Plenário da Suprema Corte: intervenha com apartes, peça vista e profira seu voto constitucional" },
  { value: "juiz", label: "Juiz", description: "Conduza a sessão e tome decisões imparciais" },
  { value: "advogado_defesa", label: "Advogado de Defesa", description: "Defenda o réu com argumentos sólidos" },
  { value: "defensor_publico", label: "Defensor Público", description: "Defenda o réu gratuitamente pelo Estado" },
  { value: "promotor", label: "Promotor", description: "Represente o Estado na acusação" },
  { value: "assistente_acusacao", label: "Assistente de Acusação", description: "Auxilie o promotor representando a vítima" },
  { value: "reu", label: "Réu", description: "Defenda-se das acusações apresentadas" },
  { value: "vitima", label: "Vítima", description: "Relate os fatos como vítima do caso" },
  { value: "testemunha", label: "Testemunha", description: "Forneça depoimentos sobre os fatos" },
  { value: "perito", label: "Perito", description: "Apresente análises técnicas especializadas" },
  { value: "jurado", label: "Jurado Popular", description: "Avalie as provas e participe da decisão" },
];

// No STF não há réu, júri nem inquirição de testemunhas: a tribuna é ocupada
// pelo PGR, pelo Advogado-Geral da União e pelos advogados das partes.
const stfRoles: { value: Role; label: string; description: string }[] = [
  { value: "ministro", label: "🏛️ Ministro Relator do STF (11ª cadeira)", description: "Você ocupa a 11ª cadeira do Plenário: apresenta o relatório, profira o voto condutor, faz apartes e participa da votação por maioria (6 votos)." },
  { value: "promotor", label: "Procurador-Geral da República (PGR)", description: "Sustente oralmente pelo Ministério Público Federal perante o Plenário." },
  { value: "advogado_defesa", label: "Advogado da Tribuna", description: "Sustente oralmente pela parte autora/requerente em uma ação constitucional." },
  { value: "assistente_acusacao", label: "Advogado-Geral da União (AGU)", description: "Defenda a norma ou ato administrativo impugnado perante o Supremo." },
];

const areas = [
  { value: "stf_constitucional", label: "🏛️ STF - Plenário Constitucional (Supremo Tribunal Federal)" },
  { value: "penal", label: "Direito Penal (Geral)" },
  { value: "homicidio", label: "Homicídio" },
  { value: "feminicidio", label: "Feminicídio" },
  { value: "latrocinio", label: "Latrocínio" },
  { value: "roubo", label: "Roubo" },
  { value: "furto", label: "Furto" },
  { value: "estupro", label: "Estupro" },
  { value: "sequestro", label: "Sequestro e Cárcere Privado" },
  { value: "extorsao", label: "Extorsão" },
  { value: "trafico_drogas", label: "Tráfico de Drogas" },
  { value: "corrupcao", label: "Corrupção" },
  { value: "estelionato", label: "Estelionato" },
  { value: "fraude", label: "Fraude" },
  { value: "apropriacao_indebita", label: "Apropriação Indébita" },
  { value: "difamacao", label: "Difamação" },
  { value: "caluna", label: "Calúnia" },
  { value: "injuria", label: "Injúria" },
  { value: "lesao_corporal", label: "Lesão Corporal" },
  { value: "criminal", label: "Direito Criminal (Geral)" },
  { value: "cdc", label: "Direito do Consumidor (CDC)" },
  { value: "trabalhista", label: "Direito Trabalhista" },
  { value: "civil", label: "Direito Civil" },
  { value: "veiculos_sinistros", label: "Veículos e Sinistros" },
  { value: "tributario", label: "Direito Tributário" },
  { value: "ambiental", label: "Direito Ambiental" },
  { value: "empresarial", label: "Direito Empresarial" },
  { value: "previdenciario", label: "Direito Previdenciário" },
  { value: "familia", label: "Direito de Família" },
  { value: "administrativo", label: "Direito Administrativo" },
];

export default function NewSession() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"area" | "generating" | "role" | "creating">("area");
  const [selectedArea, setSelectedArea] = useState<string>("aleatorio");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"facil" | "medio" | "dificil">("medio");
  const [selectedRole, setSelectedRole] = useState<Role>("juiz");
  const [generatedTrial, setGeneratedTrial] = useState<any>(null);
  // Nome com o qual a IA deve tratar o usuário. Já vem preenchido com o nome da conta
  // quando ele é real (o session.create também o persiste no perfil).
  const [userName, setUserName] = useState<string>(() => {
    const raw = user?.name?.trim();
    return raw && raw !== "Usuário Local" && raw !== "local-dev-user" ? raw : "";
  });

  // Verificar se há trialId na URL (vindo de caso personalizado)
  const urlParams = new URLSearchParams(window.location.search);
  const trialIdFromUrl = urlParams.get('trialId');

  // Se há trialId na URL, buscar o trial e ir direto para escolha de papel
  const trialQuery = trpc.trial.getById.useQuery(
    { id: parseInt(trialIdFromUrl || '0') },
    { enabled: !!trialIdFromUrl }
  );

  // Quando o trial for carregado, configurar e ir para escolha de papel
  useEffect(() => {
    if (trialQuery.data && !generatedTrial && trialIdFromUrl) {
      setGeneratedTrial(trialQuery.data);
      setStep('role');
    }
  }, [trialQuery.data, generatedTrial, trialIdFromUrl]);

  const generateMutation = trpc.trial.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedTrial(data);
      if (data.area === "stf_constitucional") {
        setSelectedRole("ministro");
      }
      setStep("role");
    },
    onError: (error) => {
      console.error("Erro ao gerar caso:", error);
      alert("Erro ao gerar caso. Tente novamente.");
      setStep("area");
    },
  });

  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      navigate(`/julgamento/${data.id}`);
    },
    onError: (error) => {
      console.error("Erro ao criar sessão:", error);
      alert("Erro ao criar sessão. Tente novamente.");
      setStep("role");
    },
  });

  const handleGenerateCase = () => {
    setStep("generating");
    generateMutation.mutate({ 
      area: selectedArea === "aleatorio" ? undefined : (selectedArea as any) || undefined,
      difficulty: selectedDifficulty
    });
  };

  const handleStartSession = () => {
    if (!generatedTrial) return;
    setStep("creating");
    createSessionMutation.mutate({
      trialId: generatedTrial.id,
      userRole: selectedRole,
      userName: userName.trim() || undefined,
    });
  };

  if (authLoading || (trialIdFromUrl && trialQuery.isLoading)) {
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
              Você precisa estar autenticado para criar uma nova sessão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full min-h-[44px]">
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
        <div className="container py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">{APP_TITLE}</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 min-h-[44px] px-4">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-6 sm:py-12">
        <div className="container max-w-4xl">
          {/* Step 1: Select Area */}
          {step === "area" && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Sessão de Julgamento</CardTitle>
                <CardDescription>
                  Escolha a área do direito para gerar um caso aleatório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="userName-area">Seu nome (opcional)</Label>
                  <Input
                    id="userName-area"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex.: Dr. João Silva"
                    maxLength={80}
                    autoComplete="name"
                  />
                  <p className="text-sm text-muted-foreground">
                    A IA usará esse nome para se dirigir a você durante o julgamento. Se deixar em branco, usaremos o nome da sua conta.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Área do Direito (opcional)</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área ou deixe em branco para aleatório" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aleatorio">Aleatório</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Se nenhuma área for selecionada, o sistema gerará um caso aleatório
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Dificuldade do Caso</Label>
                  <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as "facil" | "medio" | "dificil")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facil">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">🟢 Fácil</span>
                          <span className="text-xs text-muted-foreground">1 réu, 1 testemunha, fatos claros</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medio">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">🟡 Médio</span>
                          <span className="text-xs text-muted-foreground">1-2 réus, 2-3 testemunhas, complexidade moderada</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dificil">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">🔴 Difícil</span>
                          <span className="text-xs text-muted-foreground">2-3 réus, 3-5 testemunhas, 2 peritos, provas contraditórias</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Casos difíceis têm múltiplos réus, várias testemunhas e argumentos complexos
                  </p>
                </div>

                <Button 
                  onClick={handleGenerateCase} 
                  className="w-full min-h-[52px]"
                  size="lg"
                >
                  Gerar Caso Jurídico
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Generating */}
          {step === "generating" && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Gerando Caso Jurídico</h3>
                  <p className="text-muted-foreground">
                    Aguarde enquanto criamos um caso único e detalhado baseado em leis brasileiras...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Select Role */}
          {step === "role" && generatedTrial && (
            <div className="space-y-6">
              {/* Case Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{generatedTrial.title}</CardTitle>
                  <CardDescription className="uppercase text-xs font-semibold">
                    {generatedTrial.area}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição do Caso</h4>
                    <Streamdown>{generatedTrial.description}</Streamdown>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Fatos</h4>
                    <Streamdown>{generatedTrial.facts}</Streamdown>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Fundamentação Legal</h4>
                    <Streamdown>{generatedTrial.legalBasis}</Streamdown>
                  </div>

                  {generatedTrial.jurisprudence && (
                    <div>
                      <h4 className="font-semibold mb-2">Jurisprudência</h4>
                      <Streamdown>{generatedTrial.jurisprudence}</Streamdown>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Role Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Escolha Seu Papel</CardTitle>
                  <CardDescription>
                    Selecione o papel que você deseja desempenhar neste julgamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="userName-role">Nome que a IA usará para te chamar</Label>
                    <Input
                      id="userName-role"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex.: Dr. João Silva"
                      maxLength={80}
                      autoComplete="name"
                    />
                    <p className="text-sm text-muted-foreground">
                      Esse nome aparecerá nas falas e será usado pelos personagens e pelo Diretor de Audiência.
                    </p>
                  </div>

                  {generatedTrial.area === "stf_constitucional" && (
                    <div className="bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 flex items-start gap-3">
                      <Scale className="h-6 w-6 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-bold text-purple-900 dark:text-purple-100 text-base">
                          🏛️ Julgamento no Plenário do Supremo Tribunal Federal
                        </p>
                        <p className="text-purple-800 dark:text-purple-200 mt-1 leading-relaxed">
                          Este caso será julgado diretamente no Plenário do STF perante os Ministros da Suprema Corte. Como Ministro, você debaterá teses com os outros ministros, ouvirá sustentações orais do Procurador-Geral da República (PGR) e advogados da tribuna, podendo fazer apartes, pedir vista dos autos e proferir seu voto constitucional com fixação de tese de repercussão geral.
                        </p>
                      </div>
                    </div>
                  )}

                  <RadioGroup value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                    <div className="space-y-3">
                      {(generatedTrial.area === "stf_constitucional" ? stfRoles : roles).map((role) => (
                        <div key={role.value} className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={role.value} id={role.value} className="mt-1" />
                          <Label htmlFor={role.value} className="flex-1 cursor-pointer">
                            <div className="font-semibold">{role.label}</div>
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStep("area");
                        setGeneratedTrial(null);
                      }}
                      className="flex-1 min-h-[48px]"
                    >
                      Gerar Outro Caso
                    </Button>
                    <Button 
                      onClick={handleStartSession}
                      className="flex-1 min-h-[52px]"
                      size="lg"
                    >
                      Iniciar Julgamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Creating Session */}
          {step === "creating" && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Preparando Sessão</h3>
                  <p className="text-muted-foreground">
                    Aguarde enquanto preparamos o tribunal virtual...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
