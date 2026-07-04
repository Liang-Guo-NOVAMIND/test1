export const BOARD_SIZE = 15;

export type CellValue = 0 | 1 | 2; // 0=empty, 1=black, 2=white

export type Board = CellValue[][];

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'pvp' | 'pve';

export interface Move {
  row: number;
  col: number;
}

export interface GomokuState {
  board: Board;
  currentPlayer: CellValue; // 1 or 2
  winner: CellValue; // 0=none, 1=black wins, 2=white wins
  gameOver: boolean;
  moveCount: number;
  lastMove: Move | null;
  winningCells: Move[];
}

export const DIRECTIONS: [number, number][] = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal down-right
  [1, -1], // diagonal down-left
];
