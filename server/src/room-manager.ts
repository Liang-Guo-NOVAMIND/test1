import { randomBytes } from 'crypto';
import type { PlayerColor, GameState } from '../../src/types';
import { PLAYER_COLORS } from '../../src/types';
import {
  createGameState,
  rollDice,
  getMovablePieces,
  applyMove,
  skipTurn,
  hasAnyMove,
} from '../../src/engine';
import type { MoveResult } from '../../src/engine';
import type { RoomInfo, RoomPlayer, RoomState } from '../../src/protocol';

interface InternalPlayer {
  socketId: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
}

interface Room {
  id: string;
  name: string;
  hostSocketId: string;
  players: InternalPlayer[];
  started: boolean;
  gameState: GameState | null;
}

function generateRoomId(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRooms = new Map<string, string>();

  createRoom(socketId: string, playerName: string, roomName: string): Room {
    const id = generateRoomId();
    const room: Room = {
      id,
      name: roomName || `${playerName}'s Game`,
      hostSocketId: socketId,
      players: [
        { socketId, name: playerName, color: 'red', connected: true },
      ],
      started: false,
      gameState: null,
    };
    this.rooms.set(id, room);
    this.playerRooms.set(socketId, id);
    return room;
  }

  joinRoom(
    roomId: string,
    socketId: string,
    playerName: string,
  ): Room | string {
    const room = this.rooms.get(roomId);
    if (!room) return 'Room not found';
    if (room.started) return 'Game already in progress';
    if (room.players.length >= 4) return 'Room is full';

    const usedColors = new Set(room.players.map((p) => p.color));
    const availableColor = PLAYER_COLORS.find((c) => !usedColors.has(c));
    if (!availableColor) return 'No available color';

    room.players.push({
      socketId,
      name: playerName,
      color: availableColor,
      connected: true,
    });
    this.playerRooms.set(socketId, roomId);
    return room;
  }

  leaveRoom(socketId: string): { room: Room; removed: boolean } | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.playerRooms.delete(socketId);
    room.players = room.players.filter((p) => p.socketId !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { room, removed: true };
    }

    if (room.hostSocketId === socketId) {
      room.hostSocketId = room.players[0]!.socketId;
    }

    return { room, removed: false };
  }

  disconnectPlayer(socketId: string): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
    }

    if (room.players.every((p) => !p.connected)) {
      for (const p of room.players) {
        this.playerRooms.delete(p.socketId);
      }
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  reconnectPlayer(socketId: string, oldSocketId: string): Room | null {
    const roomId = this.playerRooms.get(oldSocketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.socketId === oldSocketId);
    if (player) {
      player.socketId = socketId;
      player.connected = true;
      this.playerRooms.delete(oldSocketId);
      this.playerRooms.set(socketId, roomId);
    }
    return room;
  }

  startGame(socketId: string): { room: Room; state: GameState } | string {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return 'Not in a room';
    const room = this.rooms.get(roomId);
    if (!room) return 'Room not found';
    if (room.hostSocketId !== socketId) return 'Only the host can start';
    if (room.players.length < 2) return 'Need at least 2 players';
    if (room.started) return 'Game already started';

    const colors = room.players.map((p) => p.color);
    const names = room.players.map((p) => p.name);
    const state = createGameState(colors, names);

    room.started = true;
    room.gameState = state;
    return { room, state };
  }

  handleRollDice(socketId: string): {
    room: Room;
    value: number;
    movablePieceIds: string[];
    autoSkip: boolean;
    newState: GameState;
  } | string {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return 'Not in a room';
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return 'No active game';

    const state = room.gameState;
    const currentPlayer = room.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.socketId !== socketId) {
      return 'Not your turn';
    }
    if (state.phase !== 'rolling') return 'Cannot roll now';

    const value = rollDice();
    const newState: GameState = {
      ...state,
      diceValue: value,
      diceRolled: true,
      phase: 'moving',
    };

    const movable = getMovablePieces(newState);
    const movablePieceIds = movable.map((p) => p.id);

    if (movablePieceIds.length === 0) {
      const skippedState = skipTurn(newState);
      room.gameState = skippedState;
      return {
        room,
        value,
        movablePieceIds: [],
        autoSkip: true,
        newState: skippedState,
      };
    }

    room.gameState = newState;
    return { room, value, movablePieceIds, autoSkip: false, newState };
  }

  handleMovePiece(socketId: string, pieceId: string): {
    room: Room;
    moveResult: MoveResult;
    state: GameState;
    gameOver: boolean;
  } | string {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return 'Not in a room';
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) return 'No active game';

    const state = room.gameState;
    const currentPlayer = room.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.socketId !== socketId) {
      return 'Not your turn';
    }
    if (state.phase !== 'moving') return 'Cannot move now';

    const movable = getMovablePieces(state);
    if (!movable.some((p) => p.id === pieceId)) return 'Invalid piece';

    const result = applyMove(state, pieceId);
    room.gameState = result.state;

    return {
      room,
      moveResult: result.moveResult,
      state: result.state,
      gameOver: result.state.phase === 'gameover',
    };
  }

  getRoom(socketId: string): Room | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) ?? null;
  }

  getRoomById(roomId: string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  listRooms(): RoomInfo[] {
    const list: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      list.push({
        id: room.id,
        name: room.name,
        hostName: room.players.find((p) => p.socketId === room.hostSocketId)?.name ?? 'Unknown',
        playerCount: room.players.length,
        maxPlayers: 4,
        started: room.started,
      });
    }
    return list;
  }

  toRoomState(room: Room): RoomState {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostSocketId,
      players: room.players.map((p): RoomPlayer => ({
        id: p.socketId,
        name: p.name,
        color: p.color,
        connected: p.connected,
      })),
      started: room.started,
      gameState: room.gameState,
    };
  }

  getPlayerRoom(socketId: string): string | undefined {
    return this.playerRooms.get(socketId);
  }

  getPlayerInRoom(room: Room, socketId: string): InternalPlayer | undefined {
    return room.players.find((p) => p.socketId === socketId);
  }

  hasAnyMoveForCurrent(state: GameState): boolean {
    return hasAnyMove(state);
  }
}
