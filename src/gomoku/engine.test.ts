import { describe, it, expect } from 'vitest';
import {
  createBoard,
  createGameState,
  isValidMove,
  getEmptyCells,
  checkWin,
  applyMove,
} from './engine';
import { BOARD_SIZE } from './types';

describe('createBoard', () => {
  it('creates a 15x15 empty board', () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_SIZE);
    for (const row of board) {
      expect(row.length).toBe(BOARD_SIZE);
      for (const cell of row) {
        expect(cell).toBe(0);
      }
    }
  });
});

describe('createGameState', () => {
  it('creates initial state with black to move', () => {
    const state = createGameState();
    expect(state.currentPlayer).toBe(1);
    expect(state.winner).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.moveCount).toBe(0);
    expect(state.lastMove).toBeNull();
    expect(state.winningCells).toEqual([]);
  });
});

describe('isValidMove', () => {
  it('returns true for empty cell', () => {
    const board = createBoard();
    expect(isValidMove(board, 7, 7)).toBe(true);
  });

  it('returns false for occupied cell', () => {
    const board = createBoard();
    board[7]![7] = 1;
    expect(isValidMove(board, 7, 7)).toBe(false);
  });

  it('returns false for out of bounds', () => {
    const board = createBoard();
    expect(isValidMove(board, -1, 0)).toBe(false);
    expect(isValidMove(board, 15, 0)).toBe(false);
    expect(isValidMove(board, 0, -1)).toBe(false);
    expect(isValidMove(board, 0, 15)).toBe(false);
  });
});

describe('getEmptyCells', () => {
  it('returns all cells for empty board', () => {
    const board = createBoard();
    expect(getEmptyCells(board).length).toBe(BOARD_SIZE * BOARD_SIZE);
  });

  it('returns fewer cells after placement', () => {
    const board = createBoard();
    board[0]![0] = 1;
    board[1]![1] = 2;
    expect(getEmptyCells(board).length).toBe(BOARD_SIZE * BOARD_SIZE - 2);
  });
});

describe('checkWin', () => {
  it('detects horizontal five in a row', () => {
    const board = createBoard();
    for (let c = 3; c <= 7; c++) board[7]![c] = 1;
    const result = checkWin(board, 7, 5, 1);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('detects vertical five in a row', () => {
    const board = createBoard();
    for (let r = 2; r <= 6; r++) board[r]![5] = 2;
    const result = checkWin(board, 4, 5, 2);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('detects diagonal five in a row', () => {
    const board = createBoard();
    for (let i = 0; i < 5; i++) board[i]![i] = 1;
    const result = checkWin(board, 2, 2, 1);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('detects anti-diagonal five in a row', () => {
    const board = createBoard();
    for (let i = 0; i < 5; i++) board[i]![14 - i] = 2;
    const result = checkWin(board, 2, 12, 2);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(5);
  });

  it('returns null for four in a row', () => {
    const board = createBoard();
    for (let c = 3; c <= 6; c++) board[7]![c] = 1;
    expect(checkWin(board, 7, 5, 1)).toBeNull();
  });
});

describe('applyMove', () => {
  it('places stone and switches player', () => {
    const state = createGameState();
    const next = applyMove(state, { row: 7, col: 7 });
    expect(next.board[7]![7]).toBe(1);
    expect(next.currentPlayer).toBe(2);
    expect(next.moveCount).toBe(1);
    expect(next.lastMove).toEqual({ row: 7, col: 7 });
  });

  it('does not modify original state', () => {
    const state = createGameState();
    applyMove(state, { row: 7, col: 7 });
    expect(state.board[7]![7]).toBe(0);
    expect(state.moveCount).toBe(0);
  });

  it('rejects invalid move', () => {
    let state = createGameState();
    state = applyMove(state, { row: 7, col: 7 });
    const same = applyMove(state, { row: 7, col: 7 });
    expect(same).toBe(state);
  });

  it('detects winner', () => {
    let state = createGameState();
    const moves = [
      { row: 7, col: 3 }, { row: 0, col: 0 },
      { row: 7, col: 4 }, { row: 0, col: 1 },
      { row: 7, col: 5 }, { row: 0, col: 2 },
      { row: 7, col: 6 }, { row: 0, col: 3 },
      { row: 7, col: 7 },
    ];
    for (const m of moves) {
      state = applyMove(state, m);
    }
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(1);
    expect(state.winningCells.length).toBe(5);
  });
});
