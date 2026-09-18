import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, Plus, Search, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { ThemeSelector } from "@/components/ThemeSelector";
import { toast } from "sonner";

export default function Multiplayer() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(7);
  const [isPublic, setIsPublic] = useState(false);

  const createRoomMutation = trpc.multiplayer.createRoom.useMutation({
    onSuccess: (data) => {
      toast.success(`Sala criada! Código: ${data.code}`);
      setLocation(`/multiplayer/lobby/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar sala");
    },
  });

  const joinRoomMutation = trpc.multiplayer.joinRoom.useMutation({
    onSuccess: (data) => {
      toast.success("Entrou na sala com sucesso!");
      setLocation(`/multiplayer/lobby/${data.room.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao entrar na sala");
    },
  });

  const { data: publicRooms } = trpc.multiplayer.listPublicRooms.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate({ maxPlayers, isPublic });
  };

  const handleJoinRoom = () => {
    if (roomCode.length !== 6) {
      toast.error("Código deve ter 6 caracteres");
      return;
    }
    joinRoomMutation.mutate({ code: roomCode.toUpperCase() });
  };

  const handleJoinPublicRoom = (code: string) => {
    joinRoomMutation.mutate({ code });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa estar autenticado para acessar o modo multiplayer.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
              <h1 className="text-xl font-bold">{APP_TITLE}</h1>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Modo Multiplayer</h2>
          <p className="text-muted-foreground">
            Jogue com amigos em tempo real! Cada jogador assume um papel diferente no tribunal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Criar Sala */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Criar Nova Sala
              </CardTitle>
              <CardDescription>
                Crie uma sala e convide seus amigos para jogar juntos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Máximo de Jogadores</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min={2}
                  max={14}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isPublic">Sala Pública</Label>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "Qualquer pessoa poderá ver e entrar na sua sala"
                  : "Apenas pessoas com o código poderão entrar"}
              </p>
              <Button
                onClick={handleCreateRoom}
                disabled={createRoomMutation.isPending}
                className="w-full"
              >
                {createRoomMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Criar Sala</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Entrar em Sala */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" /> Entrar em Sala
              </CardTitle>
              <CardDescription>
                Digite o código da sala para entrar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Código da Sala</Label>
                <Input
                  id="roomCode"
                  placeholder="Ex: ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
              </div>
              <Button
                onClick={handleJoinRoom}
                disabled={joinRoomMutation.isPending || roomCode.length !== 6}
                className="w-full"
              >
                {joinRoomMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" /> Entrar na Sala</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Salas Públicas */}
        {publicRooms && publicRooms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Salas Públicas
              </CardTitle>
              <CardDescription>
                Salas disponíveis para entrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {publicRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold">Sala {room.code}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {room.status === 'aguardando' ? 'Aguardando jogadores' : 'Em andamento'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleJoinPublicRoom(room.code)}
                      disabled={room.status !== 'aguardando' || joinRoomMutation.isPending}
                    >
                      Entrar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
