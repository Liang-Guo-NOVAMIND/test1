import type { GameState, PlayerColor } from './types';
import type { MoveResult } from './engine';

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  started: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  started: boolean;
  gameState: GameState | null;
}

export interface ClientEvents {
  'list-rooms': () => void;
  'create-room': (data: { playerName: string; roomName: string }) => void;
  'join-room': (data: { roomId: string; playerName: string }) => void;
  'leave-room': () => void;
  'start-game': () => void;
  'roll-dice': () => void;
  'move-piece': (data: { pieceId: string }) => void;
}

export interface ServerEvents {
  'room-list': (rooms: RoomInfo[]) => void;
  'room-joined': (data: { roomId: string; room: RoomState }) => void;
  'room-updated': (room: RoomState) => void;
  'game-started': (state: GameState) => void;
  'game-state': (state: GameState) => void;
  'dice-rolled': (data: {
    playerId: string;
    value: number;
    movablePieceIds: string[];
  }) => void;
  'piece-moved': (data: {
    pieceId: string;
    moveResult: MoveResult;
    state: GameState;
  }) => void;
  'turn-skipped': (state: GameState) => void;
  'game-over': (data: { rankings: PlayerColor[]; state: GameState }) => void;
  error: (message: string) => void;
  'player-disconnected': (data: {
    playerId: string;
    playerName: string;
  }) => void;
  'player-reconnected': (data: {
    playerId: string;
    playerName: string;
  }) => void;
}
