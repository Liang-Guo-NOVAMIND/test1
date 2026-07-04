export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export type Stone = 'black' | 'white';
export type Cell = Stone | null;

export interface Move {
  row: number;
  col: number;
  stone: Stone;
}

export interface GomokuState {
  board: Cell[][];
  currentPlayer: Stone;
  history: Move[];
  winner: Stone | null;
  winningCells: [number, number][] | null;
  gameOver: boolean;
}

export function createInitialState(): GomokuState {
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  return {
    board,
    currentPlayer: 'black',
    history: [],
    winner: null,
    winningCells: null,
    gameOver: false,
  };
}

export function isValidMove(state: GomokuState, row: number, col: number): boolean {
  if (state.gameOver) return false;
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  return state.board[row]![col] === null;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function checkWin(
  board: Cell[][],
  row: number,
  col: number,
  stone: Stone,
): [number, number][] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const cells: [number, number][] = [[row, col]];

    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r]![c] !== stone) break;
      cells.push([r, c]);
    }

    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r]![c] !== stone) break;
      cells.push([r, c]);
    }

    if (cells.length >= WIN_LENGTH) return cells;
  }
  return null;
}

export function placeStone(
  state: GomokuState,
  row: number,
  col: number,
): GomokuState {
  if (!isValidMove(state, row, col)) return state;

  const stone = state.currentPlayer;
  const newBoard = state.board.map((r) => [...r]);
  newBoard[row]![col] = stone;

  const move: Move = { row, col, stone };
  const newHistory = [...state.history, move];

  const winningCells = checkWin(newBoard, row, col, stone);
  const isBoardFull =
    !winningCells && newHistory.length === BOARD_SIZE * BOARD_SIZE;

  return {
    board: newBoard,
    currentPlayer: winningCells || isBoardFull ? state.currentPlayer : (stone === 'black' ? 'white' : 'black'),
    history: newHistory,
    winner: winningCells ? stone : null,
    winningCells,
    gameOver: !!winningCells || isBoardFull,
  };
}

export function undo(state: GomokuState): GomokuState {
  if (state.history.length === 0) return state;

  const newHistory = state.history.slice(0, -1);
  const newBoard: Cell[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  for (const move of newHistory) {
    newBoard[move.row]![move.col] = move.stone;
  }

  const lastMove = newHistory.length > 0 ? newHistory[newHistory.length - 1]! : null;
  const currentPlayer: Stone = lastMove
    ? (lastMove.stone === 'black' ? 'white' : 'black')
    : 'black';

  return {
    board: newBoard,
    currentPlayer,
    history: newHistory,
    winner: null,
    winningCells: null,
    gameOver: false,
  };
}

export function restart(): GomokuState {
  return createInitialState();
}
