import { describe, it, expect } from 'vitest';
import {
  createGameState,
  createPlayer,
  canMovePiece,
  getMovablePieces,
  computeMove,
  applyMove,
  hasAnyMove,
  skipTurn,
  getRelativePosition,
} from './engine';
import { GameState, Piece } from './types';

describe('createPlayer', () => {
  it('creates a player with 4 pieces at home', () => {
    const player = createPlayer('red', 'Alice');
    expect(player.color).toBe('red');
    expect(player.name).toBe('Alice');
    expect(player.pieces).toHaveLength(4);
    for (const piece of player.pieces) {
      expect(piece.position).toEqual({ type: 'home' });
      expect(piece.color).toBe('red');
    }
  });
});

describe('createGameState', () => {
  it('initialises a 2-player game', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    expect(state.players).toHaveLength(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe('rolling');
    expect(state.winner).toBeNull();
  });

  it('initialises a 4-player game', () => {
    const state = createGameState(
      ['red', 'green', 'yellow', 'blue'],
      ['A', 'B', 'C', 'D']
    );
    expect(state.players).toHaveLength(4);
  });
});

describe('canMovePiece', () => {
  it('requires 6 to leave home', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece = state.players[0]!.pieces[0]!;
    expect(canMovePiece(piece, 5, state)).toBe(false);
    expect(canMovePiece(piece, 6, state)).toBe(true);
  });

  it('allows moving on track', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 10 },
    };
    expect(canMovePiece(piece, 3, state)).toBe(true);
  });

  it('cannot move won pieces', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'won' },
    };
    expect(canMovePiece(piece, 6, state)).toBe(false);
  });

  it('allows exact finish entry', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'finish', cell: 3 },
    };
    expect(canMovePiece(piece, 2, state)).toBe(true);
    expect(canMovePiece(piece, 3, state)).toBe(false);
  });
});

describe('getMovablePieces', () => {
  it('returns empty when dice is null', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    expect(getMovablePieces(state)).toEqual([]);
  });

  it('returns pieces that can leave home on 6', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 6,
    };
    const movable = getMovablePieces(state);
    expect(movable.length).toBe(4);
  });

  it('returns no pieces when all are at home and dice < 6', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 3,
    };
    const movable = getMovablePieces(state);
    expect(movable.length).toBe(0);
  });
});

describe('computeMove', () => {
  it('moves piece from home to start position on 6', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece = state.players[0]!.pieces[0]!;
    const result = computeMove(piece, 6, state);
    expect(result.newPosition).toEqual({ type: 'track', cell: 0 });
    expect(result.path).toHaveLength(1);
  });

  it('moves piece forward on track', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 5 },
    };
    const result = computeMove(piece, 3, state);
    expect(result.newPosition).toEqual({ type: 'track', cell: 8 });
    expect(result.path).toHaveLength(3);
  });

  it('wraps around the track into finish lane', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 50 },
    };
    const result = computeMove(piece, 4, state);
    expect(result.newPosition).toEqual({ type: 'finish', cell: 3 });
  });

  it('captures opponent piece on landing', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    state.players[1]!.pieces[0]!.position = { type: 'track', cell: 10 };

    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 7 },
    };
    const result = computeMove(piece, 3, state);
    expect(result.captured).toHaveLength(1);
    expect(result.captured[0]!.color).toBe('green');
  });

  it('does not capture on safe cells', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    state.players[1]!.pieces[0]!.position = { type: 'track', cell: 13 };

    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 10 },
    };
    const result = computeMove(piece, 3, state);
    expect(result.captured).toHaveLength(0);
  });

  it('moves into finish lane', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'track', cell: 49 },
    };
    const result = computeMove(piece, 3, state);
    expect(result.newPosition).toEqual({ type: 'finish', cell: 1 });
  });

  it('wins when reaching end of finish lane', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const piece: Piece = {
      ...state.players[0]!.pieces[0]!,
      position: { type: 'finish', cell: 3 },
    };
    const result = computeMove(piece, 2, state);
    expect(result.newPosition).toEqual({ type: 'won' });
  });
});

describe('applyMove', () => {
  it('updates piece position and advances turn', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 6,
      diceRolled: true,
      phase: 'moving',
    };

    const result = applyMove(state, 'red-0');
    expect(result.state.players[0]!.pieces[0]!.position).toEqual({
      type: 'track',
      cell: 0,
    });
    expect(result.state.phase).toBe('rolling');
  });

  it('gives bonus turn on 6', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 6,
      diceRolled: true,
      phase: 'moving',
    };

    const result = applyMove(state, 'red-0');
    expect(result.state.currentPlayerIndex).toBe(0);
  });

  it('sends captured piece home', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 3,
      diceRolled: true,
      phase: 'moving',
    };
    state.players[0]!.pieces[0]!.position = { type: 'track', cell: 7 };
    state.players[1]!.pieces[0]!.position = { type: 'track', cell: 10 };

    const result = applyMove(state, 'red-0');
    expect(result.state.players[1]!.pieces[0]!.position).toEqual({
      type: 'home',
    });
    // Bonus turn for capture
    expect(result.state.currentPlayerIndex).toBe(0);
  });
});

describe('skipTurn', () => {
  it('advances to next player', () => {
    const state = createGameState(['red', 'green'], ['A', 'B']);
    const next = skipTurn(state);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.phase).toBe('rolling');
  });
});

describe('getRelativePosition', () => {
  it('returns -1 for home', () => {
    expect(getRelativePosition('red', { type: 'home' })).toBe(-1);
  });

  it('returns 0 for red at cell 0', () => {
    expect(getRelativePosition('red', { type: 'track', cell: 0 })).toBe(0);
  });

  it('returns 57 for won', () => {
    expect(getRelativePosition('red', { type: 'won' })).toBe(57);
  });

  it('accounts for green start offset', () => {
    expect(getRelativePosition('green', { type: 'track', cell: 13 })).toBe(0);
    expect(getRelativePosition('green', { type: 'track', cell: 14 })).toBe(1);
  });
});

describe('hasAnyMove', () => {
  it('returns false when all pieces are home and dice < 6', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 3,
    };
    expect(hasAnyMove(state)).toBe(false);
  });

  it('returns true when a piece can leave home on 6', () => {
    const state: GameState = {
      ...createGameState(['red', 'green'], ['A', 'B']),
      diceValue: 6,
    };
    expect(hasAnyMove(state)).toBe(true);
  });
});
