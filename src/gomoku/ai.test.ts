import { describe, it, expect } from 'vitest';
import { getAIMove } from './ai';
import { createBoard } from './engine';
import { BOARD_SIZE, Board, CellValue } from './types';

function placeStones(board: Board, stones: { r: number; c: number; v: CellValue }[]): void {
  for (const s of stones) {
    board[s.r]![s.c] = s.v;
  }
}

describe('getAIMove', () => {
  describe('all difficulties', () => {
    it('easy never places on an occupied cell', () => {
      const board = createBoard();
      board[7]![7] = 1;
      board[7]![8] = 2;
      board[6]![7] = 1;

      for (let i = 0; i < 20; i++) {
        const move = getAIMove(board, 2, 'easy');
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(BOARD_SIZE);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(BOARD_SIZE);
        expect(board[move.row]![move.col]).toBe(0);
      }
    });

    it('medium never places on an occupied cell', () => {
      const board = createBoard();
      board[7]![7] = 1;
      board[7]![8] = 2;
      board[6]![7] = 1;

      for (let i = 0; i < 20; i++) {
        const move = getAIMove(board, 2, 'medium');
        expect(board[move.row]![move.col]).toBe(0);
      }
    });

    it('hard never places on an occupied cell', () => {
      const board = createBoard();
      board[7]![7] = 1;
      board[7]![8] = 2;
      board[6]![7] = 1;

      const move = getAIMove(board, 2, 'hard');
      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.row).toBeLessThan(BOARD_SIZE);
      expect(move.col).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeLessThan(BOARD_SIZE);
      expect(board[move.row]![move.col]).toBe(0);
    }, 15000);
  });

  describe('easy', () => {
    it('returns a valid empty cell', () => {
      const board = createBoard();
      board[7]![7] = 1;
      const move = getAIMove(board, 2, 'easy');
      expect(board[move.row]![move.col]).toBe(0);
    });
  });

  describe('medium', () => {
    it('plays winning move when it has four in a row', () => {
      const board = createBoard();
      placeStones(board, [
        { r: 7, c: 3, v: 2 },
        { r: 7, c: 4, v: 2 },
        { r: 7, c: 5, v: 2 },
        { r: 7, c: 6, v: 2 },
      ]);
      const move = getAIMove(board, 2, 'medium');
      expect(move.row).toBe(7);
      expect([2, 7]).toContain(move.col);
    });

    it('blocks opponent four in a row', () => {
      const board = createBoard();
      placeStones(board, [
        { r: 7, c: 3, v: 1 },
        { r: 7, c: 4, v: 1 },
        { r: 7, c: 5, v: 1 },
        { r: 7, c: 6, v: 1 },
      ]);
      const move = getAIMove(board, 2, 'medium');
      expect(move.row).toBe(7);
      expect([2, 7]).toContain(move.col);
    });
  });

  describe('hard', () => {
    it('plays winning move immediately', () => {
      const board = createBoard();
      placeStones(board, [
        { r: 7, c: 3, v: 2 },
        { r: 7, c: 4, v: 2 },
        { r: 7, c: 5, v: 2 },
        { r: 7, c: 6, v: 2 },
      ]);
      const move = getAIMove(board, 2, 'hard');
      expect(move.row).toBe(7);
      expect([2, 7]).toContain(move.col);
    });

    it('blocks opponent winning move', () => {
      const board = createBoard();
      placeStones(board, [
        { r: 7, c: 3, v: 1 },
        { r: 7, c: 4, v: 1 },
        { r: 7, c: 5, v: 1 },
        { r: 7, c: 6, v: 1 },
      ]);
      const move = getAIMove(board, 2, 'hard');
      expect(move.row).toBe(7);
      expect([2, 7]).toContain(move.col);
    });

    it('plays center on empty board', () => {
      const board = createBoard();
      const move = getAIMove(board, 2, 'hard');
      expect(move.row).toBe(7);
      expect(move.col).toBe(7);
    });

    it('returns valid move in mid-game', () => {
      const board = createBoard();
      placeStones(board, [
        { r: 7, c: 7, v: 1 },
        { r: 7, c: 8, v: 2 },
        { r: 8, c: 7, v: 1 },
        { r: 6, c: 8, v: 2 },
        { r: 9, c: 7, v: 1 },
      ]);
      const move = getAIMove(board, 2, 'hard');
      expect(board[move.row]![move.col]).toBe(0);
    }, 15000);
  });
});
