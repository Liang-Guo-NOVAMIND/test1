import { describe, it, expect } from 'vitest';
import {
  GameEngine,
  PieceState,
  COLOURS,
  TRACK_LENGTH,
  HOME_COLUMN_LENGTH,
  PIECES_PER_PLAYER,
  type Colour,
} from './game-engine';

function makeDice(values: number[]) {
  let idx = 0;
  return () => {
    if (idx >= values.length) throw new Error('Ran out of dice values');
    return values[idx++]!;
  };
}

function getPieces(engine: GameEngine, colour: Colour) {
  return engine.state.pieces.filter(p => p.colour === colour);
}

function movePieceByIdx(engine: GameEngine, idx: number) {
  const movable = engine.getMovablePieces();
  expect(movable).toContain(idx);
  return engine.movePiece(idx);
}

function moveFirst(engine: GameEngine) {
  const movable = engine.getMovablePieces();
  expect(movable.length).toBeGreaterThan(0);
  return engine.movePiece(movable[0]!);
}

describe('GameEngine constructor', () => {
  it('creates a game with 2-4 players', () => {
    for (const count of [2, 3, 4]) {
      const engine = new GameEngine(count);
      expect(engine.state.playerCount).toBe(count);
      expect(engine.state.pieces).toHaveLength(count * PIECES_PER_PLAYER);
    }
  });

  it('defaults to 4 players', () => {
    const engine = new GameEngine();
    expect(engine.state.playerCount).toBe(4);
  });

  it('throws for invalid player count', () => {
    expect(() => new GameEngine(1)).toThrow('Player count must be between 2 and 4');
    expect(() => new GameEngine(5)).toThrow('Player count must be between 2 and 4');
  });

  it('all pieces start in YARD', () => {
    const engine = new GameEngine(4);
    for (const piece of engine.state.pieces) {
      expect(piece.state).toBe(PieceState.YARD);
      expect(piece.trackPosition).toBe(-1);
      expect(piece.homeColumnPosition).toBe(-1);
    }
  });

  it('starts with red (player 0) current', () => {
    const engine = new GameEngine(4);
    expect(engine.currentColour).toBe('red');
    expect(engine.state.currentPlayerIndex).toBe(0);
  });

  it('starts in ROLL phase with no winner', () => {
    const engine = new GameEngine(4);
    expect(engine.state.turnPhase).toBe('ROLL');
    expect(engine.state.winner).toBeNull();
    expect(engine.state.diceValue).toBeNull();
  });
});

describe('Dice rolling', () => {
  it('returns the dice value', () => {
    const engine = new GameEngine(4, makeDice([3]));
    expect(engine.rollDice()).toBe(3);
  });

  it('sets dice value in state', () => {
    const engine = new GameEngine(4, makeDice([6]));
    engine.rollDice();
    expect(engine.state.diceValue).toBe(6);
  });

  it('throws if dice already rolled', () => {
    const engine = new GameEngine(4, makeDice([6, 6]));
    engine.rollDice();
    expect(() => engine.rollDice()).toThrow('Dice already rolled');
  });

  it('throws if game is over', () => {
    const engine = buildWonGame();
    expect(() => engine.rollDice()).toThrow('Game is over');
  });

  it('rejects invalid dice roller output', () => {
    expect(() => new GameEngine(4, () => 7).rollDice()).toThrow(
      'Dice roller must return an integer between 1 and 6',
    );
    expect(() => new GameEngine(4, () => 0).rollDice()).toThrow();
    expect(() => new GameEngine(4, () => 3.5).rollDice()).toThrow();
  });

  it('auto-skips turn when no moves available', () => {
    const engine = new GameEngine(4, makeDice([3]));
    engine.rollDice();
    expect(engine.state.diceValue).toBeNull();
    expect(engine.currentColour).toBe('blue');
  });

  it('transitions to MOVE phase when moves are available', () => {
    const engine = new GameEngine(4, makeDice([6]));
    engine.rollDice();
    expect(engine.state.turnPhase).toBe('MOVE');
  });
});

describe('Piece movement - leaving YARD', () => {
  it('requires a 6 to leave yard', () => {
    const engine = new GameEngine(4, makeDice([5]));
    engine.rollDice();
    expect(engine.getMovablePieces()).toHaveLength(0);
  });

  it('moves piece from YARD to start position on roll of 6', () => {
    const engine = new GameEngine(4, makeDice([6]));
    engine.rollDice();
    const movable = engine.getMovablePieces();
    expect(movable.length).toBe(4);

    const result = engine.movePiece(movable[0]!);
    expect(result.from.state).toBe(PieceState.YARD);
    expect(result.to.state).toBe(PieceState.ACTIVE);
    expect(result.to.trackPosition).toBe(GameEngine.getStartPosition('red'));
  });

  it('places piece on correct start position per colour', () => {
    const engine = new GameEngine(4, makeDice([1, 1, 1, 1, 6]));
    for (let i = 0; i < 4; i++) engine.rollDice();
    engine.rollDice();
    moveFirst(engine);
    const redPieces = getPieces(engine, 'red');
    expect(redPieces.some(p => p.state === PieceState.ACTIVE && p.trackPosition === 0)).toBe(true);
  });
});

describe('Piece movement - track movement', () => {
  it('moves piece forward on the track', () => {
    const engine = new GameEngine(2, makeDice([6, 4]));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    const result = movePieceByIdx(engine, 0);
    expect(result.to.trackPosition).toBe(4);
  });

  it('wraps around the track', () => {
    // Blue starts at 13. After 7 moves of 6 from 13: (13+42)%52 = 3.
    const engine = new GameEngine(2, makeDice([
      6, 3,
      6, 6, 6, 6, 6, 6, 6, 6,
    ]));
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 4);
    for (let i = 0; i < 6; i++) {
      engine.rollDice(); movePieceByIdx(engine, 4);
    }
    engine.rollDice();
    const result = movePieceByIdx(engine, 4);
    expect(result.to.trackPosition).toBe(3);
  });
});

describe('Piece movement - home column', () => {
  it('enters home column from track', () => {
    const rolls: number[] = [6];
    for (let i = 0; i < 9; i++) rolls.push(6);
    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    for (let i = 0; i < 8; i++) {
      engine.rollDice();
      movePieceByIdx(engine, 0);
    }
    engine.rollDice();
    const result = movePieceByIdx(engine, 0);
    expect(result.to.state).toBe(PieceState.HOME_COLUMN);
    expect(result.to.homeColumnPosition).toBe(3);
  });

  it('moves within home column to FINISHED', () => {
    const rolls: number[] = [6];
    for (let i = 0; i < 9; i++) rolls.push(6);
    rolls.push(1);
    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    for (let i = 0; i < 9; i++) {
      engine.rollDice();
      movePieceByIdx(engine, 0);
    }
    engine.rollDice();
    const result = moveFirst(engine);
    expect(result.to.state).toBe(PieceState.FINISHED);
    expect(result.finished).toBe(true);
  });

  it('cannot overshoot the home column', () => {
    const rolls: number[] = [6];
    for (let i = 0; i < 9; i++) rolls.push(6);
    rolls.push(5);
    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    for (let i = 0; i < 9; i++) {
      engine.rollDice();
      movePieceByIdx(engine, 0);
    }
    engine.rollDice();
    expect(engine.currentColour).toBe('blue');
  });

  it('cannot overshoot when entering home column from track', () => {
    const rolls: number[] = [6];
    for (let i = 0; i < 8; i++) rolls.push(6);
    rolls.push(2);
    rolls.push(1);
    rolls.push(6);
    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    for (let i = 0; i < 8; i++) {
      engine.rollDice();
      movePieceByIdx(engine, 0);
    }
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    engine.rollDice();
    const movable = engine.getMovablePieces();
    for (const mi of movable) {
      const p = engine.state.pieces[mi]!;
      expect(p.state).not.toBe(PieceState.ACTIVE);
    }
    expect(movable.length).toBeGreaterThan(0);
  });
});

describe('Capture logic', () => {
  it('captures opponent piece on same square', () => {
    const engine = new GameEngine(2, makeDice([
      6, 3,
      6, 6, 6, 6, 6, 6, 6, 6,
    ]));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    movePieceByIdx(engine, 4);
    for (let i = 0; i < 6; i++) {
      engine.rollDice();
      movePieceByIdx(engine, 4);
    }
    engine.rollDice();
    const captureResult = movePieceByIdx(engine, 4);
    expect(captureResult.captured).not.toBeNull();
    expect(captureResult.captured!.colour).toBe('red');
    const redPieces = getPieces(engine, 'red');
    expect(redPieces[0]!.state).toBe(PieceState.YARD);
    expect(redPieces[0]!.trackPosition).toBe(-1);
  });

  it('does not capture on safe squares', () => {
    const engine = new GameEngine(2, makeDice([
      6, 6, 6, 1,
      6,
    ]));
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice();
    const result = movePieceByIdx(engine, 4);
    expect(result.captured).toBeNull();
    expect(getPieces(engine, 'red')[0]!.state).toBe(PieceState.ACTIVE);
    expect(getPieces(engine, 'red')[0]!.trackPosition).toBe(13);
  });

  it('sends captured piece back to yard', () => {
    const engine = new GameEngine(2, makeDice([
      6, 1,
      6, 6, 6, 6, 6, 6, 6, 4,
    ]));
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice(); movePieceByIdx(engine, 4);
    for (let i = 0; i < 6; i++) {
      engine.rollDice(); movePieceByIdx(engine, 4);
    }
    engine.rollDice();
    const result = movePieceByIdx(engine, 4);
    expect(result.captured).not.toBeNull();
    expect(result.captured!.colour).toBe('red');
    const red0 = getPieces(engine, 'red')[0]!;
    expect(red0.state).toBe(PieceState.YARD);
    expect(red0.trackPosition).toBe(-1);
  });
});

describe('Turn management', () => {
  it('advances turn after non-6 roll', () => {
    const engine = new GameEngine(2, makeDice([1]));
    engine.rollDice();
    expect(engine.currentColour).toBe('blue');
  });

  it('same player goes again on 6', () => {
    const engine = new GameEngine(2, makeDice([6, 3]));
    engine.rollDice();
    moveFirst(engine);
    expect(engine.currentColour).toBe('red');
    engine.rollDice();
    moveFirst(engine);
    expect(engine.currentColour).toBe('blue');
  });

  it('cycles through players in order', () => {
    const engine = new GameEngine(4, makeDice([1, 1, 1, 1]));
    expect(engine.currentColour).toBe('red');
    engine.rollDice();
    expect(engine.currentColour).toBe('blue');
    engine.rollDice();
    expect(engine.currentColour).toBe('green');
    engine.rollDice();
    expect(engine.currentColour).toBe('yellow');
    engine.rollDice();
    expect(engine.currentColour).toBe('red');
  });

  it('cycles with 2 players', () => {
    const engine = new GameEngine(2, makeDice([1, 1]));
    expect(engine.currentColour).toBe('red');
    engine.rollDice();
    expect(engine.currentColour).toBe('blue');
    engine.rollDice();
    expect(engine.currentColour).toBe('red');
  });

  it('cycles with 3 players', () => {
    const engine = new GameEngine(3, makeDice([1, 1, 1]));
    expect(engine.currentColour).toBe('red');
    engine.rollDice();
    expect(engine.currentColour).toBe('blue');
    engine.rollDice();
    expect(engine.currentColour).toBe('green');
    engine.rollDice();
    expect(engine.currentColour).toBe('red');
  });
});

describe('movePiece validation', () => {
  it('throws if dice not rolled', () => {
    const engine = new GameEngine(2);
    expect(() => engine.movePiece(0)).toThrow('Must roll dice before moving');
  });

  it('throws if game is over', () => {
    const engine = buildWonGame();
    expect(() => engine.movePiece(0)).toThrow('Game is over');
  });

  it('throws for invalid piece index', () => {
    const engine = new GameEngine(2, makeDice([6]));
    engine.rollDice();
    expect(() => engine.movePiece(99)).toThrow('Invalid piece index');
  });

  it("throws if piece doesn't belong to current player", () => {
    const engine = new GameEngine(2, makeDice([6]));
    engine.rollDice();
    expect(() => engine.movePiece(4)).toThrow('Not your piece');
  });

  it('throws if piece cannot be moved', () => {
    const engine = new GameEngine(2, makeDice([6, 2]));
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice();
    expect(() => engine.movePiece(1)).toThrow('Cannot move this piece');
  });
});

describe('Win detection', () => {
  it('detects winner when all pieces finish', () => {
    const engine = buildWonGame();
    expect(engine.state.winner).toBe('red');
    expect(engine.state.turnPhase).toBe('GAME_OVER');
  });

  it('no winner until all pieces of a colour finish', () => {
    const rolls: number[] = [6];
    for (let i = 0; i < 9; i++) rolls.push(6);
    rolls.push(1);
    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice(); movePieceByIdx(engine, 0);
    for (let i = 0; i < 9; i++) {
      engine.rollDice(); movePieceByIdx(engine, 0);
    }
    engine.rollDice(); movePieceByIdx(engine, 0);
    expect(engine.state.winner).toBeNull();
  });
});

describe('getMovablePieces', () => {
  it('returns empty when no dice rolled', () => {
    const engine = new GameEngine(2);
    expect(engine.getMovablePieces()).toHaveLength(0);
  });

  it('returns all yard pieces on 6', () => {
    const engine = new GameEngine(2, makeDice([6]));
    engine.rollDice();
    const movable = engine.getMovablePieces();
    expect(movable).toHaveLength(4);
    movable.forEach(mi => {
      expect(engine.state.pieces[mi]!.colour).toBe('red');
    });
  });

  it('returns only active pieces on non-6 when one is out', () => {
    const engine = new GameEngine(2, makeDice([6, 3]));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    const movable = engine.getMovablePieces();
    expect(movable).toHaveLength(1);
    expect(movable[0]).toBe(0);
  });

  it('does not include FINISHED pieces', () => {
    const engine = buildWonGame();
    const redPieces = getPieces(engine, 'red');
    expect(redPieces.every(p => p.state === PieceState.FINISHED)).toBe(true);
  });
});

describe('Static methods', () => {
  it('isSafeSquare returns true for safe squares', () => {
    for (const sq of [0, 8, 13, 21, 26, 34, 39, 47]) {
      expect(GameEngine.isSafeSquare(sq)).toBe(true);
    }
  });

  it('isSafeSquare returns false for non-safe squares', () => {
    for (const sq of [1, 7, 14, 51]) {
      expect(GameEngine.isSafeSquare(sq)).toBe(false);
    }
  });

  it('getStartPosition returns correct positions', () => {
    expect(GameEngine.getStartPosition('red')).toBe(0);
    expect(GameEngine.getStartPosition('blue')).toBe(13);
    expect(GameEngine.getStartPosition('green')).toBe(26);
    expect(GameEngine.getStartPosition('yellow')).toBe(39);
  });

  it('getHomeEntryPosition returns correct positions', () => {
    expect(GameEngine.getHomeEntryPosition('red')).toBe(50);
    expect(GameEngine.getHomeEntryPosition('blue')).toBe(11);
    expect(GameEngine.getHomeEntryPosition('green')).toBe(24);
    expect(GameEngine.getHomeEntryPosition('yellow')).toBe(37);
  });
});

describe('State immutability', () => {
  it('state getter returns a copy', () => {
    const engine = new GameEngine(2, makeDice([6]));
    engine.rollDice();
    const state1 = engine.state;
    const state2 = engine.state;
    expect(state1).not.toBe(state2);
    expect(state1.pieces).not.toBe(state2.pieces);
    state1.pieces[0]!.state = PieceState.FINISHED;
    expect(engine.state.pieces[0]!.state).toBe(PieceState.YARD);
  });
});

describe('MoveResult', () => {
  it('contains correct from/to for yard exit', () => {
    const engine = new GameEngine(2, makeDice([6]));
    engine.rollDice();
    const result = engine.movePiece(0);
    expect(result.from.state).toBe(PieceState.YARD);
    expect(result.from.trackPosition).toBe(-1);
    expect(result.to.state).toBe(PieceState.ACTIVE);
    expect(result.to.trackPosition).toBe(0);
    expect(result.captured).toBeNull();
    expect(result.finished).toBe(false);
    expect(result.pieceIndex).toBe(0);
  });

  it('contains correct from/to for track movement', () => {
    const engine = new GameEngine(2, makeDice([6, 4]));
    engine.rollDice(); movePieceByIdx(engine, 0);
    engine.rollDice();
    const result = movePieceByIdx(engine, 0);
    expect(result.from.state).toBe(PieceState.ACTIVE);
    expect(result.from.trackPosition).toBe(0);
    expect(result.to.state).toBe(PieceState.ACTIVE);
    expect(result.to.trackPosition).toBe(4);
  });
});

describe('Edge cases', () => {
  it('multiple same-colour pieces on same square', () => {
    const engine = new GameEngine(2, makeDice([6, 6]));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    movePieceByIdx(engine, 1);
    const redPieces = getPieces(engine, 'red');
    const atZero = redPieces.filter(p => p.trackPosition === 0);
    expect(atZero).toHaveLength(2);
  });

  it('track movement without capture', () => {
    const engine = new GameEngine(2, makeDice([6, 1]));
    engine.rollDice();
    movePieceByIdx(engine, 0);
    engine.rollDice();
    const result = movePieceByIdx(engine, 0);
    expect(result.to.trackPosition).toBe(1);
  });

  it('blue player enters home column correctly', () => {
    const rolls: number[] = [];
    rolls.push(1);
    rolls.push(6);
    for (let i = 0; i < 8; i++) rolls.push(6);
    rolls.push(2);
    rolls.push(1);
    rolls.push(2);

    const engine = new GameEngine(2, makeDice(rolls));
    engine.rollDice();
    engine.rollDice();
    movePieceByIdx(engine, 4);
    for (let i = 0; i < 8; i++) {
      engine.rollDice(); movePieceByIdx(engine, 4);
    }
    engine.rollDice(); movePieceByIdx(engine, 4);
    engine.rollDice();
    engine.rollDice();
    const result = movePieceByIdx(engine, 4);
    expect(result.to.state).toBe(PieceState.HOME_COLUMN);
    expect(result.to.homeColumnPosition).toBe(1);
  });
});

describe('Constants', () => {
  it('exports correct values', () => {
    expect(TRACK_LENGTH).toBe(52);
    expect(HOME_COLUMN_LENGTH).toBe(5);
    expect(PIECES_PER_PLAYER).toBe(4);
    expect(COLOURS).toEqual(['red', 'blue', 'green', 'yellow']);
  });
});

function buildWonGame(): GameEngine {
  const rolls: number[] = [];

  for (let piece = 0; piece < 4; piece++) {
    rolls.push(6);
    for (let i = 0; i < 8; i++) rolls.push(6);
    rolls.push(6);
    rolls.push(1);

    if (piece < 3) {
      rolls.push(1);
    }
  }

  const engine = new GameEngine(2, makeDice(rolls));

  for (let piece = 0; piece < 4; piece++) {
    engine.rollDice();
    movePieceByIdx(engine, piece);
    for (let i = 0; i < 8; i++) {
      engine.rollDice();
      movePieceByIdx(engine, piece);
    }
    engine.rollDice();
    movePieceByIdx(engine, piece);
    engine.rollDice();
    movePieceByIdx(engine, piece);

    if (piece < 3) {
      engine.rollDice();
    }
  }

  return engine;
}
