import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Users, BookOpen, Gavel, ArrowRight, FileText, Trophy, Settings } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ThemeSelector } from "@/components/ThemeSelector";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">{APP_TITLE}</h1>
          </div>
          {!loading && (
            <div className="flex flex-wrap gap-2 items-center">
              <ThemeSelector />
              {isAuthenticated ? (
                <>
                  <Link href="/campanhas">
                    <Button variant="outline" className="min-h-[44px] px-4 gap-2">
                      <Trophy className="h-4 w-4" /> Campanhas
                    </Button>
                  </Link>
                  <Link href="/criar-caso">
                    <Button variant="outline" className="min-h-[44px] px-4 gap-2">
                      <FileText className="h-4 w-4" /> Criar Caso
                    </Button>
                  </Link>
                  <Link href="/minhas-sessoes">
                    <Button variant="outline" className="min-h-[44px] px-4">Minhas Sessões</Button>
                  </Link>
                  <Link href="/multiplayer">
                    <Button variant="outline" className="min-h-[44px] px-4 gap-2">
                      <Users className="h-4 w-4" /> Multiplayer
                    </Button>
                  </Link>
                  <Link href="/configuracoes">
                    <Button variant="outline" className="min-h-[44px] px-4 gap-2">
                      <Settings className="h-4 w-4" /> Configurações
                    </Button>
                  </Link>
                  <Link href="/nova-sessao">
                    <Button className="min-h-[44px] px-4">Iniciar Julgamento</Button>
                  </Link>
                </>
              ) : (
                <Button asChild className="min-h-[44px] px-6">
                  <a href={getLoginUrl()}>Entrar</a>
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-12 sm:py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Aprenda Direito na Prática
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Participe de julgamentos virtuais realistas, escolha seu papel no tribunal 
              e desenvolva suas habilidades jurídicas com casos baseados em leis e 
              jurisprudências brasileiras.
            </p>
            {!loading && (
              <div className="pt-4">
                {isAuthenticated ? (
                  <Link href="/nova-sessao">
                    <Button size="lg" className="gap-2 min-h-[52px] px-8">
                      Começar Agora <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" asChild className="gap-2 min-h-[52px] px-8">
                    <a href={getLoginUrl()}>
                      Começar Agora <ArrowRight className="h-5 w-5" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">Como Funciona</h3>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              O simulador oferece uma experiência completa de tribunal, 
              com casos únicos e fundamentação legal rigorosa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Casos Únicos</CardTitle>
                <CardDescription>
                  Cada julgamento é gerado com IA, baseado em diferentes áreas do direito 
                  brasileiro: penal, civil, trabalhista, CDC e mais.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Escolha Seu Papel</CardTitle>
                <CardDescription>
                  Seja juiz, advogado de defesa, promotor, testemunha, perito ou jurado. 
                  A IA controla os demais participantes do julgamento.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Gavel className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Fundamentação Legal</CardTitle>
                <CardDescription>
                  Todos os argumentos são fundamentados em leis brasileiras e jurisprudências 
                  reais, proporcionando aprendizado autêntico.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Papéis Disponíveis</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha o papel que deseja desempenhar no tribunal virtual
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Juiz", desc: "Conduza a sessão e tome decisões imparciais" },
              { name: "Advogado de Defesa", desc: "Defenda o réu com argumentos sólidos" },
              { name: "Promotor", desc: "Represente o Estado na acusação" },
              { name: "Testemunha", desc: "Forneça depoimentos sobre os fatos" },
              { name: "Perito", desc: "Apresente análises técnicas especializadas" },
              { name: "Jurado Popular", desc: "Avalie as provas e participe da decisão" },
            ].map((role) => (
              <Card key={role.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <CardDescription>{role.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Novas Funcionalidades */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">🎮 Novos Modos de Jogo</h2>
            <p className="text-muted-foreground">Explore novas formas de aprender direito</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="h-8 w-8 text-primary" />
                  <CardTitle>Modo Campanha</CardTitle>
                </div>
                <CardDescription>
                  Jogue uma série de casos conectados com uma narrativa envolvente. 
                  Suas decisões afetam os próximos casos!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/campanhas">
                  <Button className="w-full" variant="outline">
                    Ver Campanhas
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <CardTitle>Casos Personalizados</CardTitle>
                </div>
                <CardDescription>
                  Crie seus próprios casos jurídicos! Descreva um caso e a IA gera 
                  tudo automaticamente: fatos, provas, participantes e mais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/criar-caso">
                  <Button className="w-full" variant="outline">
                    Criar Meu Caso
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h3 className="text-3xl font-bold mb-4">
                Pronto para Começar?
              </h3>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Entre agora e participe do seu primeiro julgamento virtual. 
                Desenvolva suas habilidades jurídicas de forma prática e interativa.
              </p>
              {!loading && (
                <div>
                  {isAuthenticated ? (
                    <Link href="/nova-sessao">
                      <Button size="lg" variant="secondary" className="gap-2">
                        Iniciar Julgamento <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <Button size="lg" variant="secondary" asChild className="gap-2">
                      <a href={getLoginUrl()}>
                        Criar Conta Grátis <ArrowRight className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{APP_TITLE} - Simulador de Tribunal Virtual Educacional</p>
          <p className="mt-2">Todos os casos são fictícios e gerados para fins educacionais</p>
        </div>
      </footer>
    </div>
  );
}
