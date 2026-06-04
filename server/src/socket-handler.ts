import { Server, Socket } from 'socket.io';
import { RoomManager } from './room-manager.js';
import { GameSnapshot } from './game-engine.js';

function roomView(room: NonNullable<ReturnType<RoomManager['getRoom']>>) {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: room.players,
    maxPlayers: room.maxPlayers,
    status: room.status,
  };
}

export function registerSocketHandlers(
  io: Server,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: Socket) => {
    let playerName = 'Anonymous';

    socket.on(
      'room:create',
      (
        data: { playerName: string; roomName: string; maxPlayers?: number },
        callback?: (res: { ok: boolean; room?: ReturnType<typeof roomView>; error?: string }) => void
      ) => {
        try {
          playerName = data.playerName;
          const room = roomManager.createRoom(
            socket.id,
            data.playerName,
            data.roomName,
            data.maxPlayers ?? 4
          );
          socket.join(room.id);
          const res = { ok: true as const, room: roomView(room) };
          if (callback) callback(res);
          io.emit('rooms:updated', roomManager.listRooms());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'room:join',
      (
        data: { roomId: string; playerName: string },
        callback?: (res: { ok: boolean; room?: ReturnType<typeof roomView>; error?: string }) => void
      ) => {
        try {
          playerName = data.playerName;
          const room = roomManager.joinRoom(
            data.roomId,
            socket.id,
            data.playerName
          );
          socket.join(room.id);
          const view = roomView(room);
          if (callback) callback({ ok: true, room: view });
          io.to(room.id).emit('room:playerJoined', {
            room: view,
            playerId: socket.id,
            playerName: data.playerName,
          });
          io.emit('rooms:updated', roomManager.listRooms());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'room:leave',
      (callback?: (res: { ok: boolean; error?: string }) => void) => {
        try {
          const room = roomManager.findRoomByPlayerId(socket.id);
          if (!room) {
            if (callback) callback({ ok: false, error: 'Not in a room' });
            return;
          }
          const roomId = room.id;
          const updatedRoom = roomManager.leaveRoom(roomId, socket.id);
          socket.leave(roomId);

          if (updatedRoom) {
            io.to(roomId).emit('room:playerLeft', {
              room: roomView(updatedRoom),
              playerId: socket.id,
            });
          } else {
            io.to(roomId).emit('room:closed', { roomId });
          }

          if (callback) callback({ ok: true });
          io.emit('rooms:updated', roomManager.listRooms());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'game:start',
      (callback?: (res: { ok: boolean; snapshot?: GameSnapshot; error?: string }) => void) => {
        try {
          const room = roomManager.findRoomByPlayerId(socket.id);
          if (!room) {
            if (callback) callback({ ok: false, error: 'Not in a room' });
            return;
          }
          const snapshot = roomManager.startGame(room.id, socket.id);
          if (callback) callback({ ok: true, snapshot });
          io.to(room.id).emit('game:started', {
            snapshot,
            players: room.players,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'game:rollDice',
      (callback?: (res: { ok: boolean; diceValue?: number; snapshot?: GameSnapshot; error?: string }) => void) => {
        try {
          const room = roomManager.findRoomByPlayerId(socket.id);
          if (!room) {
            if (callback) callback({ ok: false, error: 'Not in a room' });
            return;
          }
          const { diceValue, snapshot } = roomManager.rollDice(
            room.id,
            socket.id
          );
          if (callback) callback({ ok: true, diceValue, snapshot });
          socket.to(room.id).emit('game:diceRolled', {
            playerId: socket.id,
            diceValue,
            snapshot,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'game:movePiece',
      (
        data: { pieceIndex: number },
        callback?: (res: {
          ok: boolean;
          moveResult?: ReturnType<RoomManager['movePiece']>['moveResult'];
          snapshot?: GameSnapshot;
          error?: string;
        }) => void
      ) => {
        try {
          const room = roomManager.findRoomByPlayerId(socket.id);
          if (!room) {
            if (callback) callback({ ok: false, error: 'Not in a room' });
            return;
          }
          const { moveResult, snapshot } = roomManager.movePiece(
            room.id,
            socket.id,
            data.pieceIndex
          );
          if (callback) callback({ ok: true, moveResult, snapshot });
          socket.to(room.id).emit('game:pieceMoved', {
            playerId: socket.id,
            moveResult,
            snapshot,
          });

          if (snapshot.winner) {
            io.to(room.id).emit('game:over', {
              winner: snapshot.winner,
              rankings: snapshot.rankings,
              snapshot,
            });
            io.emit('rooms:updated', roomManager.listRooms());
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (callback) callback({ ok: false, error: msg });
        }
      }
    );

    socket.on(
      'rooms:list',
      (callback?: (res: { ok: boolean; rooms: ReturnType<RoomManager['listRooms']> }) => void) => {
        if (callback) callback({ ok: true, rooms: roomManager.listRooms() });
      }
    );

    socket.on('disconnect', () => {
      const room = roomManager.findRoomByPlayerId(socket.id);
      if (!room) return;

      const roomId = room.id;
      const updatedRoom = roomManager.leaveRoom(roomId, socket.id);

      if (updatedRoom) {
        io.to(roomId).emit('room:playerLeft', {
          room: roomView(updatedRoom),
          playerId: socket.id,
        });
      } else {
        io.to(roomId).emit('room:closed', { roomId });
      }

      io.emit('rooms:updated', roomManager.listRooms());
    });
  });
}
