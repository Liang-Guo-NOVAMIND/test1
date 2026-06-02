export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
  id: string;
  color: PlayerColor;
  index: number; // 0-3 per player
  position: PiecePosition;
}

export type PiecePosition =
  | { type: 'home' }
  | { type: 'track'; cell: number } // 0-51 on the shared track
  | { type: 'finish'; cell: number } // 0-5 in the finish lane (5 = won)
  | { type: 'won' };

export interface Player {
  color: PlayerColor;
  pieces: Piece[];
  name: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolled: boolean;
  phase: 'rolling' | 'moving' | 'gameover';
  consecutiveSixes: number;
  winner: PlayerColor | null;
  rankings: PlayerColor[];
  animating: boolean;
}

export interface BoardCell {
  x: number;
  y: number;
}

export const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#E53935',
  green: '#43A047',
  yellow: '#FDD835',
  blue: '#1E88E5',
};

export const COLOR_HEX_LIGHT: Record<PlayerColor, string> = {
  red: '#FFCDD2',
  green: '#C8E6C9',
  yellow: '#FFF9C4',
  blue: '#BBDEFB',
};

export const COLOR_HEX_DARK: Record<PlayerColor, string> = {
  red: '#B71C1C',
  green: '#1B5E20',
  yellow: '#F9A825',
  blue: '#0D47A1',
};

export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

export const FINISH_ENTRY: Record<PlayerColor, number> = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
};
