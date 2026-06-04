import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE,
  WIN_LENGTH,
  createInitialState,
  isValidMove,
  placeStone,
  undo,
  restart,
} from './gomoku-engine';

describe('createInitialState', () => {
  it('creates a 15x15 empty board', () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(BOARD_SIZE);
    for (const row of state.board) {
      expect(row).toHaveLength(BOARD_SIZE);
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it('starts with black to play', () => {
    const state = createInitialState();
    expect(state.currentPlayer).toBe('black');
  });

  it('starts with empty history', () => {
    const state = createInitialState();
    expect(state.history).toHaveLength(0);
  });

  it('starts with no winner and game not over', () => {
    const state = createInitialState();
    expect(state.winner).toBeNull();
    expect(state.winningCells).toBeNull();
    expect(state.gameOver).toBe(false);
  });
});

describe('isValidMove', () => {
  it('allows placing on empty cell', () => {
    const state = createInitialState();
    expect(isValidMove(state, 7, 7)).toBe(true);
  });

  it('rejects out-of-bounds negative row', () => {
    const state = createInitialState();
    expect(isValidMove(state, -1, 7)).toBe(false);
  });

  it('rejects out-of-bounds large row', () => {
    const state = createInitialState();
    expect(isValidMove(state, BOARD_SIZE, 7)).toBe(false);
  });

  it('rejects out-of-bounds negative col', () => {
    const state = createInitialState();
    expect(isValidMove(state, 7, -1)).toBe(false);
  });

  it('rejects out-of-bounds large col', () => {
    const state = createInitialState();
    expect(isValidMove(state, 7, BOARD_SIZE)).toBe(false);
  });

  it('rejects occupied cell', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    expect(isValidMove(state, 7, 7)).toBe(false);
  });

  it('rejects move when game is over', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, 0, i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, 1, i);
      }
    }
    expect(state.gameOver).toBe(true);
    expect(isValidMove(state, 5, 5)).toBe(false);
  });
});

describe('placeStone', () => {
  it('places a stone and alternates turn', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    expect(state.board[7]![7]).toBe('black');
    expect(state.currentPlayer).toBe('white');
    expect(state.history).toHaveLength(1);
  });

  it('alternates between black and white', () => {
    let state = createInitialState();
    state = placeStone(state, 0, 0);
    expect(state.currentPlayer).toBe('white');
    state = placeStone(state, 0, 1);
    expect(state.currentPlayer).toBe('black');
    state = placeStone(state, 1, 0);
    expect(state.currentPlayer).toBe('white');
  });

  it('returns same state for invalid move', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    const before = state;
    const after = placeStone(state, 7, 7);
    expect(after).toBe(before);
  });

  it('records moves in history', () => {
    let state = createInitialState();
    state = placeStone(state, 3, 4);
    state = placeStone(state, 5, 6);
    expect(state.history).toHaveLength(2);
    expect(state.history[0]).toEqual({ row: 3, col: 4, stone: 'black' });
    expect(state.history[1]).toEqual({ row: 5, col: 6, stone: 'white' });
  });

  it('does not mutate the original state', () => {
    const state = createInitialState();
    const next = placeStone(state, 7, 7);
    expect(state.board[7]![7]).toBeNull();
    expect(next.board[7]![7]).toBe('black');
    expect(state.history).toHaveLength(0);
    expect(next.history).toHaveLength(1);
  });
});

describe('win detection - horizontal', () => {
  it('detects five in a row horizontally', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, 7, i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, 8, i);
      }
    }
    expect(state.winner).toBe('black');
    expect(state.gameOver).toBe(true);
    expect(state.winningCells).not.toBeNull();
    expect(state.winningCells!.length).toBeGreaterThanOrEqual(WIN_LENGTH);
  });

  it('detects win at end of row', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, 7, BOARD_SIZE - WIN_LENGTH + i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, 8, i);
      }
    }
    expect(state.winner).toBe('black');
  });
});

describe('win detection - vertical', () => {
  it('detects five in a row vertically', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, i, 7);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, i, 8);
      }
    }
    expect(state.winner).toBe('black');
    expect(state.gameOver).toBe(true);
  });
});

describe('win detection - diagonal', () => {
  it('detects five in a row on main diagonal', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, i, i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, i, i + 1);
      }
    }
    expect(state.winner).toBe('black');
    expect(state.gameOver).toBe(true);
  });

  it('detects five in a row on anti-diagonal', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, i, WIN_LENGTH - 1 - i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, i + 5, i);
      }
    }
    expect(state.winner).toBe('black');
    expect(state.gameOver).toBe(true);
  });
});

describe('win detection - white wins', () => {
  it('detects white winning', () => {
    let state = createInitialState();
    state = placeStone(state, 0, 0);
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, 7, i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, 8, i);
      }
    }
    expect(state.winner).toBe('white');
  });
});

describe('win detection - no false positives', () => {
  it('four in a row is not a win', () => {
    let state = createInitialState();
    for (let i = 0; i < 4; i++) {
      state = placeStone(state, 7, i);
      state = placeStone(state, 8, i);
    }
    expect(state.winner).toBeNull();
    expect(state.gameOver).toBe(false);
  });

  it('broken line is not a win', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 0);
    state = placeStone(state, 8, 0);
    state = placeStone(state, 7, 1);
    state = placeStone(state, 8, 1);
    state = placeStone(state, 7, 3);
    state = placeStone(state, 8, 3);
    state = placeStone(state, 7, 4);
    state = placeStone(state, 8, 4);
    state = placeStone(state, 7, 5);
    expect(state.winner).toBeNull();
  });
});

describe('draw detection', () => {
  it('detects draw when board is full with no winner', () => {
    let state = createInitialState();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!state.gameOver) {
          state = placeStone(state, r, c);
        }
      }
    }
    if (state.winner === null) {
      expect(state.gameOver).toBe(true);
    }
  });
});

describe('undo', () => {
  it('removes the last move', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    state = undo(state);
    expect(state.board[7]![7]).toBeNull();
    expect(state.currentPlayer).toBe('black');
    expect(state.history).toHaveLength(0);
  });

  it('restores to previous player', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    state = placeStone(state, 8, 8);
    state = undo(state);
    expect(state.currentPlayer).toBe('white');
    expect(state.history).toHaveLength(1);
    expect(state.board[8]![8]).toBeNull();
    expect(state.board[7]![7]).toBe('black');
  });

  it('does nothing on empty history', () => {
    const state = createInitialState();
    const after = undo(state);
    expect(after).toBe(state);
  });

  it('clears win state after undoing winning move', () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_LENGTH; i++) {
      state = placeStone(state, 7, i);
      if (i < WIN_LENGTH - 1) {
        state = placeStone(state, 8, i);
      }
    }
    expect(state.gameOver).toBe(true);
    state = undo(state);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.winningCells).toBeNull();
  });

  it('allows placing a stone after undo', () => {
    let state = createInitialState();
    state = placeStone(state, 7, 7);
    state = undo(state);
    state = placeStone(state, 3, 3);
    expect(state.board[3]![3]).toBe('black');
    expect(state.board[7]![7]).toBeNull();
  });

  it('supports multiple undos', () => {
    let state = createInitialState();
    state = placeStone(state, 0, 0);
    state = placeStone(state, 1, 1);
    state = placeStone(state, 2, 2);
    state = undo(state);
    state = undo(state);
    expect(state.history).toHaveLength(1);
    expect(state.board[0]![0]).toBe('black');
    expect(state.board[1]![1]).toBeNull();
    expect(state.board[2]![2]).toBeNull();
    expect(state.currentPlayer).toBe('white');
  });
});

describe('restart', () => {
  it('returns a fresh initial state', () => {
    const state = restart();
    expect(state.currentPlayer).toBe('black');
    expect(state.history).toHaveLength(0);
    expect(state.winner).toBeNull();
    expect(state.gameOver).toBe(false);
    for (const row of state.board) {
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });
});

describe('constants', () => {
  it('BOARD_SIZE is 15', () => {
    expect(BOARD_SIZE).toBe(15);
  });

  it('WIN_LENGTH is 5', () => {
    expect(WIN_LENGTH).toBe(5);
  });
});
