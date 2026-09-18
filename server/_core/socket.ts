import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as db from '../db';

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/socket.io/"
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    // Entrar em uma sala
    socket.on('join-room', async (data: { roomCode: string; userId: number; playerName: string }) => {
      try {
        const room = await db.getRoomByCode(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala não encontrada' });
          return;
        }

        // Adicionar jogador à sala
        await db.addPlayerToRoom(room.id, data.userId, data.playerName);
        
        // Entrar no canal da sala
        socket.join(`room-${room.id}`);
        
        // Notificar todos na sala
        const players = await db.getRoomPlayers(room.id);
        io?.to(`room-${room.id}`).emit('room-updated', { room, players });
        
        console.log(`[Socket.IO] Jogador ${data.playerName} entrou na sala ${data.roomCode}`);
      } catch (error) {
        console.error('[Socket.IO] Erro ao entrar na sala:', error);
        socket.emit('error', { message: 'Erro ao entrar na sala' });
      }
    });

    // Sair de uma sala
    socket.on('leave-room', async (data: { roomId: number; userId: number }) => {
      try {
        await db.removePlayerFromRoom(data.roomId, data.userId);
        socket.leave(`room-${data.roomId}`);
        
        const players = await db.getRoomPlayers(data.roomId);
        const room = await db.getRoomById(data.roomId);
        io?.to(`room-${data.roomId}`).emit('room-updated', { room, players });
        
        console.log(`[Socket.IO] Jogador saiu da sala ${data.roomId}`);
      } catch (error) {
        console.error('[Socket.IO] Erro ao sair da sala:', error);
      }
    });

    // Marcar jogador como pronto
    socket.on('player-ready', async (data: { roomId: number; userId: number; isReady: boolean }) => {
      try {
        await db.updatePlayerReady(data.roomId, data.userId, data.isReady);
        
        const players = await db.getRoomPlayers(data.roomId);
        const room = await db.getRoomById(data.roomId);
        io?.to(`room-${data.roomId}`).emit('room-updated', { room, players });
      } catch (error) {
        console.error('[Socket.IO] Erro ao atualizar status pronto:', error);
      }
    });

    // Selecionar papel
    socket.on('select-role', async (data: { roomId: number; userId: number; role: string }) => {
      try {
        await db.updatePlayerRole(data.roomId, data.userId, data.role);
        
        const players = await db.getRoomPlayers(data.roomId);
        const room = await db.getRoomById(data.roomId);
        io?.to(`room-${data.roomId}`).emit('room-updated', { room, players });
      } catch (error) {
        console.error('[Socket.IO] Erro ao selecionar papel:', error);
      }
    });

    // Iniciar julgamento
    socket.on('start-trial', async (data: { roomId: number; hostUserId: number }) => {
      try {
        const room = await db.getRoomById(data.roomId);
        if (!room || room.hostUserId !== data.hostUserId) {
          socket.emit('error', { message: 'Apenas o host pode iniciar o julgamento' });
          return;
        }

        // Verificar se todos estão prontos
        const players = await db.getRoomPlayers(data.roomId);
        const allReady = players.every((p: any) => p.isReady);
        if (!allReady) {
          socket.emit('error', { message: 'Todos os jogadores devem estar prontos' });
          return;
        }

        // Verificar se pelo menos um jogador selecionou papel
        const someHaveRoles = players.some((p: any) => p.selectedRole);
        if (!someHaveRoles) {
          socket.emit('error', { message: 'Pelo menos um jogador deve selecionar um papel' });
          return;
        }

        // Importar funções necessárias
        const { generateTrialWithAI, generateParticipantsForTrial } = await import('../routers');
        
        // Gerar caso com IA
        const trial = await generateTrialWithAI();
        
        // Criar sessão multiplayer para cada jogador
        const sessionIds: number[] = [];
        
        for (const player of players) {
          if (player.selectedRole) {
            const sessionId = await db.createSession({
              userId: player.userId,
              trialId: trial.id,
              userRole: player.selectedRole as any,
              status: 'em_andamento',
              isMultiplayer: true,
              roomId: data.roomId,
            });
            sessionIds.push(sessionId);
          }
        }
        
        // Identificar papéis escolhidos pelos jogadores
        const chosenRoles = players
          .filter((p: any) => p.selectedRole)
          .map((p: any) => p.selectedRole);
        
        // Gerar participantes IA para TODOS os papéis (incluindo os escolhidos)
        // Os jogadores reais vão "substituir" os participantes IA quando falarem
        await generateParticipantsForTrial(trial.id, chosenRoles[0] || 'juiz');
        
        // Atualizar status da sala e salvar o ID da primeira sessão
        await db.updateRoomStatus(data.roomId, 'em_andamento', sessionIds[0]);
        
        io?.to(`room-${data.roomId}`).emit('trial-started', { 
          roomId: data.roomId,
          sessionId: sessionIds[0],
          trialId: trial.id,
        });
      } catch (error) {
        console.error('[Socket.IO] Erro ao iniciar julgamento:', error);
      }
    });

    // Nova mensagem no julgamento
    socket.on('trial-message', async (data: { sessionId: number; message: any }) => {
      try {
        // Broadcast para todos na sessão
        io?.to(`session-${data.sessionId}`).emit('new-message', data.message);
      } catch (error) {
        console.error('[Socket.IO] Erro ao enviar mensagem:', error);
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Servidor WebSocket inicializado');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
