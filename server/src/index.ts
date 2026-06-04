import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClientEvents, ServerEvents } from '../../src/protocol';
import { RoomManager } from './room-manager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = express();
app.use(cors());

const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const httpServer = createServer(app);

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: '*' },
});

const manager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('list-rooms', () => {
    socket.emit('room-list', manager.listRooms());
  });

  socket.on('create-room', ({ playerName, roomName }) => {
    const room = manager.createRoom(socket.id, playerName, roomName);
    void socket.join(room.id);
    socket.emit('room-joined', {
      roomId: room.id,
      room: manager.toRoomState(room),
    });
    io.emit('room-list', manager.listRooms());
  });

  socket.on('join-room', ({ roomId, playerName }) => {
    const result = manager.joinRoom(roomId, socket.id, playerName);
    if (typeof result === 'string') {
      socket.emit('error', result);
      return;
    }
    void socket.join(result.id);
    const roomState = manager.toRoomState(result);
    socket.emit('room-joined', { roomId: result.id, room: roomState });
    socket.to(result.id).emit('room-updated', roomState);
    io.emit('room-list', manager.listRooms());
  });

  socket.on('leave-room', () => {
    const result = manager.leaveRoom(socket.id);
    if (!result) return;
    void socket.leave(result.room.id);
    if (!result.removed) {
      socket.to(result.room.id).emit('room-updated', manager.toRoomState(result.room));
    }
    io.emit('room-list', manager.listRooms());
  });

  socket.on('start-game', () => {
    const result = manager.startGame(socket.id);
    if (typeof result === 'string') {
      socket.emit('error', result);
      return;
    }
    io.to(result.room.id).emit('game-started', result.state);
    io.emit('room-list', manager.listRooms());
  });

  socket.on('roll-dice', () => {
    const result = manager.handleRollDice(socket.id);
    if (typeof result === 'string') {
      socket.emit('error', result);
      return;
    }

    io.to(result.room.id).emit('dice-rolled', {
      playerId: socket.id,
      value: result.value,
      movablePieceIds: result.movablePieceIds,
    });

    if (result.autoSkip) {
      setTimeout(() => {
        io.to(result.room.id).emit('turn-skipped', result.newState);
      }, 1500);
    }
  });

  socket.on('move-piece', ({ pieceId }) => {
    const result = manager.handleMovePiece(socket.id, pieceId);
    if (typeof result === 'string') {
      socket.emit('error', result);
      return;
    }

    io.to(result.room.id).emit('piece-moved', {
      pieceId,
      moveResult: result.moveResult,
      state: result.state,
    });

    if (result.gameOver) {
      io.to(result.room.id).emit('game-over', {
        rankings: result.state.rankings,
        state: result.state,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const room = manager.disconnectPlayer(socket.id);
    if (room) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        socket.to(room.id).emit('player-disconnected', {
          playerId: socket.id,
          playerName: player.name,
        });
      }
      socket.to(room.id).emit('room-updated', manager.toRoomState(room));
    }
    io.emit('room-list', manager.listRooms());
  });
});

httpServer.listen(PORT, () => {
  console.log(`Ludo server running on http://localhost:${PORT}`);
});
