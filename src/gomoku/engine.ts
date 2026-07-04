import {
  BOARD_SIZE,
  Board,
  CellValue,
  GomokuState,
  Move,
  DIRECTIONS,
} from './types';

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as CellValue)
  );
}

export function createGameState(): GomokuState {
  return {
    board: createBoard(),
    currentPlayer: 1,
    winner: 0,
    gameOver: false,
    moveCount: 0,
    lastMove: null,
    winningCells: [],
  };
}

export function isValidMove(board: Board, row: number, col: number): boolean {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row]![col] === 0
  );
}

export function getEmptyCells(board: Board): Move[] {
  const cells: Move[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] === 0) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

function countInDirection(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: CellValue
): { count: number; cells: Move[] } {
  const cells: Move[] = [];
  let r = row + dr;
  let c = col + dc;
  while (
    r >= 0 &&
    r < BOARD_SIZE &&
    c >= 0 &&
    c < BOARD_SIZE &&
    board[r]![c] === player
  ) {
    cells.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  return { count: cells.length, cells };
}

export function checkWin(
  board: Board,
  row: number,
  col: number,
  player: CellValue
): Move[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const forward = countInDirection(board, row, col, dr!, dc!, player);
    const backward = countInDirection(board, row, col, -dr!, -dc!, player);
    const total = 1 + forward.count + backward.count;
    if (total >= 5) {
      return [{ row, col }, ...forward.cells, ...backward.cells];
    }
  }
  return null;
}

export function applyMove(state: GomokuState, move: Move): GomokuState {
  if (!isValidMove(state.board, move.row, move.col)) {
    return state;
  }

  const newBoard = state.board.map((row) => [...row]) as Board;
  newBoard[move.row]![move.col] = state.currentPlayer;

  const winCells = checkWin(newBoard, move.row, move.col, state.currentPlayer);
  const moveCount = state.moveCount + 1;
  const isDraw = !winCells && moveCount === BOARD_SIZE * BOARD_SIZE;

  return {
    board: newBoard,
    currentPlayer: winCells || isDraw
      ? state.currentPlayer
      : ((3 - state.currentPlayer) as CellValue),
    winner: winCells ? state.currentPlayer : 0,
    gameOver: !!winCells || isDraw,
    moveCount,
    lastMove: move,
    winningCells: winCells ?? [],
  };
}

export function opponent(player: CellValue): CellValue {
  return (3 - player) as CellValue;
}
