import {
  BOARD_SIZE,
  Board,
  CellValue,
  Difficulty,
  Move,
  DIRECTIONS,
} from './types';
import { getEmptyCells, isValidMove, checkWin, opponent } from './engine';

export function getAIMove(
  board: Board,
  aiPlayer: CellValue,
  difficulty: Difficulty
): Move {
  switch (difficulty) {
    case 'easy':
      return easyMove(board);
    case 'medium':
      return mediumMove(board, aiPlayer);
    case 'hard':
      return hardMove(board, aiPlayer);
  }
}

function easyMove(board: Board): Move {
  const empty = getEmptyCells(board);
  return empty[Math.floor(Math.random() * empty.length)]!;
}

function mediumMove(board: Board, aiPlayer: CellValue): Move {
  const opp = opponent(aiPlayer);

  const winMove = findThreatMove(board, aiPlayer, 4);
  if (winMove) return winMove;

  const blockMove = findThreatMove(board, opp, 4);
  if (blockMove) return blockMove;

  const threat3 = findThreatMove(board, aiPlayer, 3);
  if (threat3) return threat3;

  const block3 = findThreatMove(board, opp, 3);
  if (block3) return block3;

  return easyMove(board);
}

function findThreatMove(
  board: Board,
  player: CellValue,
  targetLen: number
): Move | null {
  const empty = getEmptyCells(board);
  for (const cell of empty) {
    for (const [dr, dc] of DIRECTIONS) {
      const forward = countDir(board, cell.row, cell.col, dr!, dc!, player);
      const backward = countDir(board, cell.row, cell.col, -dr!, -dc!, player);
      if (forward + backward >= targetLen) {
        return cell;
      }
    }
  }
  return null;
}

function countDir(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: CellValue
): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (
    r >= 0 &&
    r < BOARD_SIZE &&
    c >= 0 &&
    c < BOARD_SIZE &&
    board[r]![c] === player
  ) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

// --- Hard AI: Negamax with alpha-beta pruning ---

const SCORE_FIVE = 1000000;
const SCORE_OPEN_FOUR = 50000;
const SCORE_HALF_FOUR = 5000;
const SCORE_OPEN_THREE = 5000;
const SCORE_HALF_THREE = 500;
const SCORE_OPEN_TWO = 500;
const SCORE_HALF_TWO = 50;

const MAX_DEPTH = 3;
const MAX_CANDIDATES = 15;

function hardMove(board: Board, aiPlayer: CellValue): Move {
  const candidates = getCandidateMoves(board, aiPlayer);
  if (candidates.length === 0) {
    return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
  }

  if (candidates.length === 1) return candidates[0]!;

  for (const move of candidates) {
    board[move.row]![move.col] = aiPlayer;
    if (checkWin(board, move.row, move.col, aiPlayer)) {
      board[move.row]![move.col] = 0;
      return move;
    }
    board[move.row]![move.col] = 0;
  }

  const opp = opponent(aiPlayer);
  for (const move of candidates) {
    board[move.row]![move.col] = opp;
    if (checkWin(board, move.row, move.col, opp)) {
      board[move.row]![move.col] = 0;
      return move;
    }
    board[move.row]![move.col] = 0;
  }

  let bestScore = -Infinity;
  let bestMove = candidates[0]!;

  for (const move of candidates) {
    board[move.row]![move.col] = aiPlayer;
    const score = -negamax(board, MAX_DEPTH - 1, -Infinity, Infinity, opp, aiPlayer);
    board[move.row]![move.col] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function negamax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  current: CellValue,
  aiPlayer: CellValue
): number {
  if (depth === 0) {
    const raw = evaluateBoard(board, aiPlayer);
    return current === aiPlayer ? raw : -raw;
  }

  const candidates = getCandidateMoves(board, current);
  if (candidates.length === 0) return 0;

  for (const move of candidates) {
    board[move.row]![move.col] = current;

    if (checkWin(board, move.row, move.col, current)) {
      board[move.row]![move.col] = 0;
      return SCORE_FIVE;
    }

    const score = -negamax(
      board,
      depth - 1,
      -beta,
      -alpha,
      opponent(current),
      aiPlayer
    );
    board[move.row]![move.col] = 0;

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function scoreMoveHeuristic(board: Board, row: number, col: number, player: CellValue): number {
  let score = 0;
  const opp = opponent(player);
  for (const [dr, dc] of DIRECTIONS) {
    const f = countDir(board, row, col, dr!, dc!, player);
    const b = countDir(board, row, col, -dr!, -dc!, player);
    const own = f + b;
    const fOpp = countDir(board, row, col, dr!, dc!, opp);
    const bOpp = countDir(board, row, col, -dr!, -dc!, opp);
    const oppCount = fOpp + bOpp;

    if (own >= 4) score += 100000;
    else if (own === 3) score += 1000;
    else if (own === 2) score += 100;
    else if (own === 1) score += 10;

    if (oppCount >= 4) score += 50000;
    else if (oppCount === 3) score += 500;
    else if (oppCount === 2) score += 50;
  }

  const center = Math.floor(BOARD_SIZE / 2);
  const dist = Math.abs(row - center) + Math.abs(col - center);
  score += Math.max(0, 14 - dist);

  return score;
}

function getCandidateMoves(board: Board, player: CellValue): Move[] {
  const seen = new Set<number>();
  const moves: { move: Move; score: number }[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] === 0) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          for (let dist = 1; dist <= 2; dist++) {
            const nr = r + dr * dist;
            const nc = c + dc * dist;
            const key = nr * BOARD_SIZE + nc;
            if (!seen.has(key) && isValidMove(board, nr, nc)) {
              seen.add(key);
              moves.push({
                move: { row: nr, col: nc },
                score: scoreMoveHeuristic(board, nr, nc, player),
              });
            }
          }
        }
      }
    }
  }

  if (moves.length === 0 && board[7]![7] === 0) {
    return [{ row: 7, col: 7 }];
  }

  moves.sort((a, b) => b.score - a.score);
  return moves.slice(0, MAX_CANDIDATES).map((m) => m.move);
}

function evaluateBoard(board: Board, aiPlayer: CellValue): number {
  let score = 0;
  const opp = opponent(aiPlayer);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const result = evaluateLine(board, r, c, dr!, dc!);
        if (result.player === aiPlayer) {
          score += result.score;
        } else if (result.player === opp) {
          score -= result.score;
        }
      }
    }
  }

  return score;
}

interface LineEval {
  player: CellValue;
  score: number;
}

function evaluateLine(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number
): LineEval {
  const none: LineEval = { player: 0, score: 0 };

  let count = 0;
  let player: CellValue = 0;

  for (let i = 0; i < 5; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return none;

    const val = board[r]![c]!;
    if (val !== 0) {
      if (player === 0) {
        player = val;
      } else if (val !== player) {
        return none;
      }
      count++;
    }
  }

  if (count === 0 || player === 0) return none;

  const beforeR = row - dr;
  const beforeC = col - dc;
  const afterR = row + dr * 5;
  const afterC = col + dc * 5;

  const openBefore =
    beforeR >= 0 &&
    beforeR < BOARD_SIZE &&
    beforeC >= 0 &&
    beforeC < BOARD_SIZE &&
    board[beforeR]![beforeC] === 0;

  const openAfter =
    afterR >= 0 &&
    afterR < BOARD_SIZE &&
    afterC >= 0 &&
    afterC < BOARD_SIZE &&
    board[afterR]![afterC] === 0;

  const openEnds = (openBefore ? 1 : 0) + (openAfter ? 1 : 0);

  let score = 0;
  if (count >= 5) {
    score = SCORE_FIVE;
  } else if (count === 4) {
    score = openEnds === 2 ? SCORE_OPEN_FOUR : openEnds === 1 ? SCORE_HALF_FOUR : 0;
  } else if (count === 3) {
    score = openEnds === 2 ? SCORE_OPEN_THREE : openEnds === 1 ? SCORE_HALF_THREE : 0;
  } else if (count === 2) {
    score = openEnds === 2 ? SCORE_OPEN_TWO : openEnds === 1 ? SCORE_HALF_TWO : 0;
  }

  return { player, score };
}
