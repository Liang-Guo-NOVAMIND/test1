export const PLAYERS = ['red', 'green', 'yellow', 'blue'];
export const PLAYER_LABELS = ['Red', 'Green', 'Yellow', 'Blue'];
export const PIECES_PER_PLAYER = 4;
export const TRACK_LENGTH = 56;
export const FINISH_LANE_LENGTH = 6;

const TRACK_COORDS = buildTrackCoords();
const FINISH_LANES = buildFinishLanes();
const HOME_POSITIONS = buildHomePositions();

const PLAYER_START = [35, 49, 7, 21];
const PLAYER_FINISH_ENTRY = [34, 48, 6, 20];

function buildTrackCoords() {
  const coords = [];
  for (let r = 5; r >= 0; r--) coords.push([r, 6]);
  coords.push([0, 7], [0, 8]);
  for (let r = 1; r <= 5; r++) coords.push([r, 8]);
  coords.push([6, 8]);
  for (let c = 9; c <= 14; c++) coords.push([6, c]);
  coords.push([7, 14], [8, 14]);
  for (let c = 13; c >= 9; c--) coords.push([8, c]);
  coords.push([8, 8]);
  for (let r = 9; r <= 14; r++) coords.push([r, 8]);
  coords.push([14, 7], [14, 6]);
  for (let r = 13; r >= 9; r--) coords.push([r, 6]);
  coords.push([8, 6]);
  for (let c = 5; c >= 0; c--) coords.push([8, c]);
  coords.push([7, 0], [6, 0]);
  for (let c = 1; c <= 5; c++) coords.push([6, c]);
  coords.push([6, 6]);
  return coords;
}

function buildFinishLanes() {
  return [
    Array.from({ length: 6 }, (_, i) => [13 - i, 7]),
    Array.from({ length: 6 }, (_, i) => [7, 1 + i]),
    Array.from({ length: 6 }, (_, i) => [1 + i, 7]),
    Array.from({ length: 6 }, (_, i) => [7, 13 - i]),
  ];
}

function buildHomePositions() {
  return [
    [[10, 1], [10, 3], [12, 1], [12, 3]],
    [[1, 1], [1, 3], [3, 1], [3, 3]],
    [[1, 10], [1, 12], [3, 10], [3, 12]],
    [[10, 10], [10, 12], [12, 10], [12, 12]],
  ];
}

export function getTrackCoords() { return TRACK_COORDS; }
export function getFinishLanes() { return FINISH_LANES; }
export function getHomePositions() { return HOME_POSITIONS; }
export function getPlayerStart(p) { return PLAYER_START[p]; }
export function getPlayerFinishEntry(p) { return PLAYER_FINISH_ENTRY[p]; }

const SAFE_CELLS = new Set([
  ...PLAYER_START,
  1, 15, 29, 43,
]);
export function isSafeCell(pos) { return SAFE_CELLS.has(pos); }

export function createInitialState(playerCount = 4) {
  const activePlayers = getActivePlayers(playerCount);
  const pieces = [];
  for (const p of activePlayers) {
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      pieces.push({
        player: p,
        index: i,
        zone: 'home',
        trackPos: -1,
        finishPos: -1,
      });
    }
  }
  return {
    currentPlayer: activePlayers[0],
    diceValue: null,
    phase: 'roll',
    pieces,
    winner: -1,
    playerCount,
    activePlayers,
  };
}

export function getActivePlayers(playerCount = 4) {
  if (playerCount === 2) return [0, 2];
  if (playerCount === 3) return [0, 1, 2];
  return [0, 1, 2, 3];
}

export function nextPlayer(state) {
  const { activePlayers, currentPlayer } = state;
  const idx = activePlayers.indexOf(currentPlayer);
  return activePlayers[(idx + 1) % activePlayers.length];
}

export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

export function getPieceCoords(piece) {
  if (piece.zone === 'home') return HOME_POSITIONS[piece.player][piece.index];
  if (piece.zone === 'track') return TRACK_COORDS[piece.trackPos];
  if (piece.zone === 'finish') return FINISH_LANES[piece.player][piece.finishPos];
  if (piece.zone === 'finished') return FINISH_LANES[piece.player][FINISH_LANE_LENGTH - 1];
  return [7, 7];
}

function playerRelative(player, absPos) {
  let rel = absPos - PLAYER_START[player];
  if (rel < 0) rel += TRACK_LENGTH;
  return rel;
}

function absoluteFromRelative(player, rel) {
  return (PLAYER_START[player] + rel) % TRACK_LENGTH;
}

export function getMovablePieces(state) {
  const { currentPlayer, diceValue, pieces } = state;
  if (diceValue === null) return [];
  const movable = [];
  for (let idx = 0; idx < pieces.length; idx++) {
    const p = pieces[idx];
    if (p.player !== currentPlayer) continue;
    if (p.zone === 'finished') continue;
    if (p.zone === 'home') {
      if (diceValue === 6) movable.push(idx);
    } else if (p.zone === 'track') {
      const rel = playerRelative(currentPlayer, p.trackPos);
      const newRel = rel + diceValue;
      if (newRel < TRACK_LENGTH) {
        movable.push(idx);
      } else {
        const finishSteps = newRel - TRACK_LENGTH + 1;
        if (finishSteps <= FINISH_LANE_LENGTH) movable.push(idx);
      }
    } else if (p.zone === 'finish') {
      if (p.finishPos + diceValue < FINISH_LANE_LENGTH) movable.push(idx);
    }
  }
  return movable;
}

export function computeMove(state, pieceIdx) {
  const piece = state.pieces[pieceIdx];
  const player = piece.player;
  const dice = state.diceValue;
  const result = { type: null, path: [], kicked: -1, finished: false };

  if (piece.zone === 'home') {
    result.type = 'deploy';
    result.path = [TRACK_COORDS[PLAYER_START[player]]];
    return result;
  }

  if (piece.zone === 'finish') {
    result.type = 'finish-advance';
    const start = piece.finishPos;
    for (let i = start + 1; i <= start + dice; i++) {
      result.path.push(FINISH_LANES[player][i]);
    }
    if (start + dice === FINISH_LANE_LENGTH - 1) result.finished = true;
    return result;
  }

  const rel = playerRelative(player, piece.trackPos);
  const newRel = rel + dice;

  if (newRel >= TRACK_LENGTH) {
    result.type = 'enter-finish';
    let pos = piece.trackPos;
    const entryPos = PLAYER_FINISH_ENTRY[player];
    while (pos !== entryPos) {
      pos = (pos + 1) % TRACK_LENGTH;
      result.path.push(TRACK_COORDS[pos]);
    }
    const finishSteps = newRel - TRACK_LENGTH + 1;
    for (let i = 0; i < finishSteps; i++) {
      result.path.push(FINISH_LANES[player][i]);
    }
    if (finishSteps - 1 === FINISH_LANE_LENGTH - 1) result.finished = true;
    return result;
  }

  result.type = 'track-move';
  let pos = piece.trackPos;
  const target = absoluteFromRelative(player, newRel);
  while (pos !== target) {
    pos = (pos + 1) % TRACK_LENGTH;
    result.path.push(TRACK_COORDS[pos]);
  }

  if (!isSafeCell(target)) {
    for (let i = 0; i < state.pieces.length; i++) {
      const other = state.pieces[i];
      if (i !== pieceIdx && other.player !== player &&
          other.zone === 'track' && other.trackPos === target) {
        result.kicked = i;
        break;
      }
    }
  }

  return result;
}

export function applyMove(state, pieceIdx, moveResult) {
  const piece = state.pieces[pieceIdx];
  const player = piece.player;
  const rolledSix = state.diceValue === 6;

  if (moveResult.type === 'deploy') {
    piece.zone = 'track';
    piece.trackPos = PLAYER_START[player];
  } else if (moveResult.type === 'track-move') {
    const rel = playerRelative(player, piece.trackPos) + state.diceValue;
    piece.trackPos = absoluteFromRelative(player, rel);
  } else if (moveResult.type === 'enter-finish') {
    const rel = playerRelative(player, piece.trackPos) + state.diceValue;
    const finishSteps = rel - TRACK_LENGTH + 1;
    piece.zone = 'finish';
    piece.trackPos = -1;
    piece.finishPos = finishSteps - 1;
  } else if (moveResult.type === 'finish-advance') {
    piece.finishPos += state.diceValue;
  }

  if (moveResult.finished) {
    piece.zone = 'finished';
  }

  if (moveResult.kicked >= 0) {
    const kicked = state.pieces[moveResult.kicked];
    kicked.zone = 'home';
    kicked.trackPos = -1;
    kicked.finishPos = -1;
  }

  const allFinished = state.pieces
    .filter(p => p.player === player)
    .every(p => p.zone === 'finished');
  if (allFinished) {
    state.winner = player;
    state.phase = 'won';
    state.diceValue = null;
    return;
  }

  state.diceValue = null;
  if (rolledSix) {
    state.phase = 'roll';
  } else {
    state.currentPlayer = nextPlayer(state);
    state.phase = 'roll';
  }
}

export function getColorForPlayer(playerIdx) {
  return ['#E53935', '#43A047', '#FDD835', '#1E88E5'][playerIdx];
}

export function getLightColorForPlayer(playerIdx) {
  return ['#FFCDD2', '#C8E6C9', '#FFF9C4', '#BBDEFB'][playerIdx];
}
