import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Key, Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Verificar se há API key configurada
  const apiStatusQuery = trpc.settings.getApiStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // Buscar API key do usuário
  const userApiKeyQuery = trpc.settings.getUserApiKey.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // Mutations
  const saveApiKeyMutation = trpc.settings.saveUserApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key salva com sucesso!");
      setOpenaiKey("");
      apiStatusQuery.refetch();
      userApiKeyQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });
  
  const removeApiKeyMutation = trpc.settings.removeUserApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key removida com sucesso!");
      setOpenaiKey("");
      apiStatusQuery.refetch();
      userApiKeyQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSaveApiKey = async () => {
    if (!openaiKey.trim()) {
      toast.error("Por favor, insira uma API key válida");
      return;
    }

    if (!openaiKey.startsWith("sk-")) {
      toast.error("API key da OpenAI deve começar com 'sk-'");
      return;
    }

    saveApiKeyMutation.mutate({ apiKey: openaiKey });
  };
  
  const handleRemoveApiKey = () => {
    if (confirm("Tem certeza que deseja remover sua API key?")) {
      removeApiKeyMutation.mutate();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold text-gray-900">{APP_TITLE}</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Configurações</h2>
            <p className="text-muted-foreground">Gerencie suas preferências e configurações</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status da API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Status da API
              </CardTitle>
              <CardDescription>
                Informações sobre qual API está sendo usada para geração de conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiStatusQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </div>
              ) : apiStatusQuery.data?.usingCustomKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    Usando API personalizada da OpenAI (GPT-4o)
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você está usando sua própria API key da OpenAI. Os custos serão cobrados diretamente na sua conta OpenAI.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    Usando API da Manus (padrão)
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você está usando a API integrada da plataforma Manus. Sem custos adicionais.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração de API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key da OpenAI
              </CardTitle>
              <CardDescription>
                Configure sua própria API key da OpenAI para usar GPT-4o ao invés da API da Manus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userApiKeyQuery.data?.hasApiKey ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 mb-1">API Key Configurada</p>
                      <p className="text-sm text-green-700 mb-2">
                        Você tem uma API key salva: <code className="bg-green-100 px-1 rounded font-mono text-xs">{userApiKeyQuery.data.preview}</code>
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveApiKey}
                        disabled={removeApiKeyMutation.isPending}
                      >
                        {removeApiKeyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          "Remover API Key"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Como configurar sua API key:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Obtenha sua API key em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></li>
                      <li>Cole sua API key no campo abaixo</li>
                      <li>Clique em "Salvar API Key"</li>
                      <li>Pronto! O sistema usará sua API key automaticamente</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key da OpenAI</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sua API key começa com "sk-" e tem cerca de 50 caracteres
                </p>
              </div>

              {!userApiKeyQuery.data?.hasApiKey && (
                <Button
                  onClick={handleSaveApiKey}
                  disabled={saveApiKeyMutation.isPending || !openaiKey.trim()}
                  className="w-full"
                >
                  {saveApiKeyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar API Key
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informações de Custo */}
          <Card>
            <CardHeader>
              <CardTitle>Custos Estimados (OpenAI)</CardTitle>
              <CardDescription>
                Estimativa de custos ao usar sua própria API key da OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geração de caso jurídico:</span>
                  <span className="font-semibold">$0.01 - $0.03</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debate completo (sessão):</span>
                  <span className="font-semibold">$0.05 - $0.15</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Julgamento completo (total):</span>
                  <span className="font-semibold text-primary">$0.10 - $0.20</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Dica:</strong> Valores aproximados usando GPT-4o. Consulte a{" "}
                    <a
                      href="https://openai.com/api/pricing/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      página de preços da OpenAI
                    </a>{" "}
                    para valores atualizados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outras Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>
                Configure suas preferências de uso do simulador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações de progresso</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações quando documentos visuais forem gerados
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo verboso</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir logs detalhados durante o julgamento
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
