import {
  GameState,
  Piece,
  PiecePosition,
  Player,
  PlayerColor,
  START_POSITIONS,
  SAFE_CELLS,
  FINISH_ENTRY,
} from './types';

export function createPlayer(color: PlayerColor, name: string): Player {
  const pieces: Piece[] = Array.from({ length: 4 }, (_, i) => ({
    id: `${color}-${i}`,
    color,
    index: i,
    position: { type: 'home' },
  }));
  return { color, pieces, name };
}

export function createGameState(
  playerColors: PlayerColor[],
  names: string[]
): GameState {
  const players = playerColors.map((c, i) => createPlayer(c, names[i]!));
  return {
    players,
    currentPlayerIndex: 0,
    diceValue: null,
    diceRolled: false,
    phase: 'rolling',
    consecutiveSixes: 0,
    winner: null,
    rankings: [],
    animating: false,
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function trackDistance(from: number, to: number): number {
  return (to - from + 52) % 52;
}

function advanceOnTrack(cell: number, steps: number): number {
  return (cell + steps) % 52;
}

function stepsToFinishEntry(color: PlayerColor, currentCell: number): number {
  const entry = FINISH_ENTRY[color];
  return trackDistance(currentCell, entry);
}

export function getRelativePosition(
  color: PlayerColor,
  position: PiecePosition
): number {
  if (position.type === 'home') return -1;
  if (position.type === 'won') return 57;
  if (position.type === 'finish') return 52 + position.cell;
  const start = START_POSITIONS[color];
  return trackDistance(start, position.cell);
}

export function canMovePiece(
  piece: Piece,
  diceValue: number,
  _state: GameState
): boolean {
  const pos = piece.position;

  if (pos.type === 'won') return false;

  if (pos.type === 'home') {
    return diceValue === 6;
  }

  if (pos.type === 'finish') {
    const target = pos.cell + diceValue;
    return target <= 5;
  }

  if (pos.type === 'track') {
    const distToEntry = stepsToFinishEntry(piece.color, pos.cell);

    if (distToEntry === 0) {
      return true;
    }

    if (distToEntry <= diceValue) {
      const remaining = diceValue - distToEntry;
      return remaining <= 5;
    }

    return true;
  }

  return false;
}

export function getMovablePieces(state: GameState): Piece[] {
  if (state.diceValue === null) return [];
  const player = state.players[state.currentPlayerIndex]!;
  return player.pieces.filter((p) => canMovePiece(p, state.diceValue!, state));
}

export interface MoveResult {
  newPosition: PiecePosition;
  captured: Piece[];
  path: PiecePosition[];
}

export function computeMove(
  piece: Piece,
  diceValue: number,
  state: GameState
): MoveResult {
  const pos = piece.position;
  const path: PiecePosition[] = [];

  if (pos.type === 'home') {
    const startCell = START_POSITIONS[piece.color];
    path.push({ type: 'track', cell: startCell });
    const captured = getCapturedPieces(
      piece,
      { type: 'track', cell: startCell },
      state
    );
    return { newPosition: { type: 'track', cell: startCell }, captured, path };
  }

  if (pos.type === 'finish') {
    const target = pos.cell + diceValue;
    for (let i = pos.cell + 1; i <= target; i++) {
      if (i >= 5) {
        path.push({ type: 'won' });
      } else {
        path.push({ type: 'finish', cell: i });
      }
    }
    const newPos: PiecePosition =
      target >= 5 ? { type: 'won' } : { type: 'finish', cell: target };
    return { newPosition: newPos, captured: [], path };
  }

  if (pos.type === 'track') {
    const distToEntry = stepsToFinishEntry(piece.color, pos.cell);

    if (distToEntry > 0 && distToEntry <= diceValue) {
      for (let i = 1; i <= distToEntry; i++) {
        path.push({ type: 'track', cell: advanceOnTrack(pos.cell, i) });
      }
      const remaining = diceValue - distToEntry;
      if (remaining === 0) {
        const entryCell = advanceOnTrack(pos.cell, distToEntry);
        const newPos: PiecePosition = { type: 'track', cell: entryCell };
        const captured = getCapturedPieces(piece, newPos, state);
        return { newPosition: newPos, captured, path };
      }
      for (let step = 1; step <= remaining; step++) {
        const cell = step - 1;
        if (cell >= 5) {
          path.push({ type: 'won' });
        } else {
          path.push({ type: 'finish', cell });
        }
      }
      const finalCell = remaining - 1;
      const newPos: PiecePosition =
        finalCell >= 5
          ? { type: 'won' }
          : { type: 'finish', cell: finalCell };
      return { newPosition: newPos, captured: [], path };
    }

    if (distToEntry === 0) {
      for (let step = 1; step <= diceValue; step++) {
        const cell = step - 1;
        if (cell >= 5) {
          path.push({ type: 'won' });
        } else {
          path.push({ type: 'finish', cell });
        }
      }
      const finalCell = diceValue - 1;
      const newPos: PiecePosition =
        finalCell >= 5
          ? { type: 'won' }
          : { type: 'finish', cell: finalCell };
      return { newPosition: newPos, captured: [], path };
    }

    for (let i = 1; i <= diceValue; i++) {
      path.push({ type: 'track', cell: advanceOnTrack(pos.cell, i) });
    }
    const newCell = advanceOnTrack(pos.cell, diceValue);
    const newPos: PiecePosition = { type: 'track', cell: newCell };
    const captured = getCapturedPieces(piece, newPos, state);
    return { newPosition: newPos, captured, path };
  }

  return { newPosition: pos, captured: [], path };
}

function getCapturedPieces(
  movingPiece: Piece,
  newPos: PiecePosition,
  state: GameState
): Piece[] {
  if (newPos.type !== 'track') return [];
  if (SAFE_CELLS.includes(newPos.cell)) return [];

  const captured: Piece[] = [];
  for (const player of state.players) {
    if (player.color === movingPiece.color) continue;
    for (const p of player.pieces) {
      if (p.position.type === 'track' && p.position.cell === newPos.cell) {
        captured.push(p);
      }
    }
  }
  return captured;
}

export function applyMove(
  state: GameState,
  pieceId: string
): { state: GameState; moveResult: MoveResult } {
  if (state.diceValue === null) return { state, moveResult: { newPosition: { type: 'home' }, captured: [], path: [] } };

  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex]!;
  const piece = player.pieces.find((p) => p.id === pieceId);
  if (!piece) return { state, moveResult: { newPosition: { type: 'home' }, captured: [], path: [] } };

  const diceValue = state.diceValue;
  const moveResult = computeMove(piece, diceValue, state);

  const newPlayers = state.players.map((pl) => ({
    ...pl,
    pieces: pl.pieces.map((p) => {
      if (p.id === pieceId) {
        return { ...p, position: moveResult.newPosition };
      }
      if (moveResult.captured.some((c) => c.id === p.id)) {
        return { ...p, position: { type: 'home' as const } };
      }
      return p;
    }),
  }));

  const updatedPlayer = newPlayers[playerIndex]!;
  const allWon = updatedPlayer.pieces.every((p) => p.position.type === 'won');
  const rankings = [...state.rankings];
  if (allWon && !rankings.includes(updatedPlayer.color)) {
    rankings.push(updatedPlayer.color);
  }

  const playersStillPlaying = newPlayers.filter(
    (p) => !rankings.includes(p.color)
  );
  const gameover =
    playersStillPlaying.length <= 1
      ? true
      : false;

  if (gameover && playersStillPlaying.length === 1) {
    rankings.push(playersStillPlaying[0]!.color);
  }

  const gotSix = diceValue === 6;
  const captured = moveResult.captured.length > 0;
  const bonusTurn = (gotSix || captured) && !gameover;

  let consecutiveSixes = gotSix ? state.consecutiveSixes + 1 : 0;
  let nextPlayerIndex = playerIndex;

  if (consecutiveSixes >= 3) {
    bonusTurn;
    consecutiveSixes = 0;
    nextPlayerIndex = getNextPlayerIndex(
      playerIndex,
      newPlayers,
      rankings
    );
  } else if (!bonusTurn) {
    consecutiveSixes = 0;
    nextPlayerIndex = getNextPlayerIndex(
      playerIndex,
      newPlayers,
      rankings
    );
  }

  const newState: GameState = {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    diceValue: null,
    diceRolled: false,
    phase: gameover ? 'gameover' : 'rolling',
    consecutiveSixes,
    winner: rankings.length > 0 ? rankings[0]! : null,
    rankings,
    animating: false,
  };

  return { state: newState, moveResult };
}

function getNextPlayerIndex(
  currentIndex: number,
  players: Player[],
  rankings: PlayerColor[]
): number {
  const count = players.length;
  let next = (currentIndex + 1) % count;
  for (let i = 0; i < count; i++) {
    if (!rankings.includes(players[next]!.color)) {
      return next;
    }
    next = (next + 1) % count;
  }
  return currentIndex;
}

export function hasAnyMove(state: GameState): boolean {
  return getMovablePieces(state).length > 0;
}

export function skipTurn(state: GameState): GameState {
  const nextPlayerIndex = getNextPlayerIndex(
    state.currentPlayerIndex,
    state.players,
    state.rankings
  );
  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    diceValue: null,
    diceRolled: false,
    phase: 'rolling',
    consecutiveSixes: 0,
    animating: false,
  };
}
