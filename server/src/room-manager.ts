import { v4 as uuidv4 } from 'uuid';
import { Colour, COLOURS, GameEngine, GameSnapshot } from './game-engine.js';

export interface PlayerInfo {
  id: string;
  name: string;
  colour: Colour;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: PlayerInfo[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  engine: GameEngine | null;
  createdAt: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: Room['status'];
}

export class RoomManager {
  private _rooms = new Map<string, Room>();

  createRoom(
    hostId: string,
    hostName: string,
    roomName: string,
    maxPlayers: number = 4
  ): Room {
    if (maxPlayers < 2 || maxPlayers > 4) {
      throw new Error('Max players must be between 2 and 4');
    }

    const room: Room = {
      id: uuidv4(),
      name: roomName,
      hostId,
      players: [{ id: hostId, name: hostName, colour: COLOURS[0]! }],
      maxPlayers,
      status: 'waiting',
      engine: null,
      createdAt: Date.now(),
    };

    this._rooms.set(room.id, room);
    return room;
  }

  joinRoom(roomId: string, playerId: string, playerName: string): Room {
    const room = this._rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'waiting') throw new Error('Game already in progress');
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
    if (room.players.some((p) => p.id === playerId)) {
      throw new Error('Already in this room');
    }

    const usedColours = new Set(room.players.map((p) => p.colour));
    const colour = COLOURS.find((c) => !usedColours.has(c));
    if (!colour) throw new Error('No available colour');

    room.players.push({ id: playerId, name: playerName, colour });
    return room;
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this._rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this._rooms.delete(roomId);
      return null;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0]!.id;
    }

    if (room.status === 'playing') {
      room.status = 'finished';
      room.engine = null;
    }

    return room;
  }

  startGame(roomId: string, requesterId: string): GameSnapshot {
    const room = this._rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== requesterId) throw new Error('Only the host can start');
    if (room.status !== 'waiting') throw new Error('Game already started');
    if (room.players.length < 2) throw new Error('Need at least 2 players');

    room.engine = new GameEngine(room.players.length);
    room.status = 'playing';
    return room.engine.snapshot;
  }

  rollDice(roomId: string, playerId: string): { diceValue: number; snapshot: GameSnapshot } {
    const room = this._rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing' || !room.engine)
      throw new Error('Game not in progress');

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error('Player not in room');
    if (playerIndex !== room.engine.snapshot.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    const diceValue = room.engine.rollDice();
    const snapshot = room.engine.snapshot;

    if (snapshot.winner) {
      room.status = 'finished';
    }

    return { diceValue, snapshot };
  }

  movePiece(
    roomId: string,
    playerId: string,
    pieceIndex: number
  ): { moveResult: ReturnType<GameEngine['movePiece']>; snapshot: GameSnapshot } {
    const room = this._rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing' || !room.engine)
      throw new Error('Game not in progress');

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error('Player not in room');
    if (playerIndex !== room.engine.snapshot.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    const moveResult = room.engine.movePiece(pieceIndex);
    const snapshot = room.engine.snapshot;

    if (snapshot.winner) {
      room.status = 'finished';
    }

    return { moveResult, snapshot };
  }

  getRoom(roomId: string): Room | undefined {
    return this._rooms.get(roomId);
  }

  getGameSnapshot(roomId: string): GameSnapshot | null {
    const room = this._rooms.get(roomId);
    if (!room?.engine) return null;
    return room.engine.snapshot;
  }

  listRooms(): RoomSummary[] {
    return Array.from(this._rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      status: r.status,
    }));
  }

  findRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this._rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room;
      }
    }
    return undefined;
  }

  removeRoom(roomId: string): void {
    this._rooms.delete(roomId);
  }
}
