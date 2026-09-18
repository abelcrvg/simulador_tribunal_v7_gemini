import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Copy, Check, Play, ArrowLeft, Crown } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { ThemeSelector } from "@/components/ThemeSelector";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

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
  jurado: "Jurado",
};

const availableRoles = Object.keys(roleLabels);

export default function MultiplayerLobby() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const roomId = parseInt(params.id || "0");
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [localPlayers, setLocalPlayers] = useState<any[]>([]);

  const { data: roomData, refetch } = trpc.multiplayer.getRoom.useQuery(
    { roomId },
    { enabled: !!roomId && isAuthenticated }
  );

  const leaveRoomMutation = trpc.multiplayer.leaveRoom.useMutation({
    onSuccess: () => {
      toast.success("Você saiu da sala");
      setLocation("/multiplayer");
    },
  });

  // Conectar ao Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const newSocket = io({
      path: "/socket.io/",
    });

    newSocket.on("connect", () => {
      console.log("Conectado ao Socket.IO");
      newSocket.emit("join-room", {
        roomCode: roomData?.room.code,
        userId: user.id,
        playerName: user.name || "Jogador",
      });
    });

    newSocket.on("room-updated", (data) => {
      console.log("Sala atualizada", data);
      setLocalPlayers(data.players || []);
      refetch();
    });

    newSocket.on("trial-started", (data) => {
      console.log("Julgamento iniciado", data);
      toast.success("Julgamento iniciado!");
      // Redirecionar para a página de julgamento
      // setLocation(`/trial/${data.sessionId}`);
    });

    newSocket.on("error", (data) => {
      toast.error(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, roomData?.room.code]);

  const handleCopyCode = () => {
    if (roomData?.room.code) {
      navigator.clipboard.writeText(roomData.room.code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectRole = (role: string) => {
    if (!socket || !user) return;
    
    // Verificar se o papel já está ocupado usando localPlayers para dados mais atualizados
    const playersToCheck = localPlayers.length > 0 ? localPlayers : (roomData?.players || []);
    const roleOccupied = playersToCheck.some(
      (p: any) => p.selectedRole === role && p.userId !== user.id
    );
    
    if (roleOccupied) {
      toast.error("Este papel já está ocupado");
      return;
    }
    
    setSelectedRole(role);
    socket.emit("select-role", {
      roomId,
      userId: user.id,
      role,
    });
  };

  const handleToggleReady = () => {
    if (!socket || !user) return;
    
    if (!selectedRole) {
      toast.error("Selecione um papel primeiro");
      return;
    }
    
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit("player-ready", {
      roomId,
      userId: user.id,
      isReady: newReadyState,
    });
  };

  const handleStartTrial = () => {
    if (!socket || !user) return;
    
    const allReady = roomData?.players.every((p) => p.isReady);
    if (!allReady) {
      toast.error("Todos os jogadores devem estar prontos");
      return;
    }
    
    socket.emit("start-trial", {
      roomId,
      hostUserId: user.id,
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave-room", {
        roomId,
        userId: user?.id,
      });
    }
    leaveRoomMutation.mutate({ roomId });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Sala não encontrada</CardTitle>
            <CardDescription>Verifique o código e tente novamente.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { room, players } = roomData;
  const isHost = user?.id === room.hostUserId;
  // Usar localPlayers se disponível para dados mais atualizados
  const currentPlayers = localPlayers.length > 0 ? localPlayers : players;
  const allReady = currentPlayers.every((p: any) => p.isReady);
  
  // Debug logs
  console.log('[MultiplayerLobby] isHost:', isHost);
  console.log('[MultiplayerLobby] allReady:', allReady);
  console.log('[MultiplayerLobby] currentPlayers:', currentPlayers);
  
  // Sincronizar estado local com dados do servidor
  useEffect(() => {
    if (user && currentPlayers.length > 0) {
      const myPlayer = currentPlayers.find((p: any) => p.userId === user.id);
      if (myPlayer) {
        setSelectedRole(myPlayer.selectedRole || null);
        setIsReady(myPlayer.isReady || false);
      }
    }
  }, [currentPlayers, user]);

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
            <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Sair da Sala
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Lobby Multiplayer</h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <p>Código da Sala:</p>
            <code className="px-3 py-1 bg-muted rounded font-mono text-lg font-bold">
              {room.code}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Jogadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Jogadores ({players.length}/{room.maxPlayers})
              </CardTitle>
              <CardDescription>
                Aguardando todos os jogadores ficarem prontos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentPlayers.map((player: any) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {player.userId === room.hostUserId && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-semibold">{player.playerName}</p>
                        {player.selectedRole && (
                          <p className="text-sm text-muted-foreground">
                            {roleLabels[player.selectedRole]}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={player.isReady ? "default" : "secondary"}>
                      {player.isReady ? "Pronto" : "Aguardando"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Papéis */}
          <Card>
            <CardHeader>
              <CardTitle>Selecione seu Papel</CardTitle>
              <CardDescription>
                Escolha o papel que deseja desempenhar no julgamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {availableRoles.map((role) => {
                  const isOccupied = currentPlayers.some(
                    (p: any) => p.selectedRole === role && p.userId !== user?.id
                  );
                  const isSelected = selectedRole === role;

                  return (
                    <Button
                      key={role}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectRole(role)}
                      disabled={isOccupied}
                      className="justify-start"
                    >
                      {roleLabels[role]}
                      {isOccupied && " (Ocupado)"}
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleToggleReady}
                  variant={isReady ? "secondary" : "default"}
                  className="w-full"
                  disabled={!selectedRole}
                >
                  {isReady ? "Cancelar Pronto" : "Estou Pronto"}
                </Button>

                {isHost && (
                  <Button
                    onClick={handleStartTrial}
                    disabled={!allReady}
                    variant="default"
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Iniciar Julgamento
                  </Button>
                )}
              </div>

              {isHost && !allReady && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Aguardando todos os jogadores ficarem prontos para iniciar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
