export type Colour = 'red' | 'blue' | 'green' | 'yellow';

export const COLOURS: readonly Colour[] = ['red', 'blue', 'green', 'yellow'] as const;

export enum PieceState {
  YARD = 'YARD',
  ACTIVE = 'ACTIVE',
  HOME_COLUMN = 'HOME_COLUMN',
  FINISHED = 'FINISHED',
}

export const TRACK_LENGTH = 52;
export const HOME_COLUMN_LENGTH = 5;
export const PIECES_PER_PLAYER = 4;

const START_POSITIONS: Record<Colour, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

const HOME_ENTRY_POSITIONS: Record<Colour, number> = {
  red: 50,
  blue: 11,
  green: 24,
  yellow: 37,
};

const SAFE_SQUARES: ReadonlySet<number> = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export interface Piece {
  readonly colour: Colour;
  readonly index: number;
  state: PieceState;
  trackPosition: number;
  homeColumnPosition: number;
}

export interface MoveResult {
  pieceIndex: number;
  from: { state: PieceState; trackPosition: number; homeColumnPosition: number };
  to: { state: PieceState; trackPosition: number; homeColumnPosition: number };
  captured: { colour: Colour; pieceIndex: number } | null;
  finished: boolean;
}

export type DiceRoller = () => number;

export function defaultDiceRoller(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export interface GameState {
  pieces: Piece[];
  currentPlayerIndex: number;
  diceValue: number | null;
  playerCount: number;
  winner: Colour | null;
  turnPhase: 'ROLL' | 'MOVE' | 'GAME_OVER';
}

export class GameEngine {
  private _pieces: Piece[] = [];
  private _currentPlayerIndex = 0;
  private _diceValue: number | null = null;
  private _playerCount: number;
  private _winner: Colour | null = null;
  private _diceRoller: DiceRoller;

  constructor(playerCount: number = 4, diceRoller: DiceRoller = defaultDiceRoller) {
    if (playerCount < 2 || playerCount > 4) {
      throw new Error('Player count must be between 2 and 4');
    }
    this._playerCount = playerCount;
    this._diceRoller = diceRoller;
    this._initPieces();
  }

  private _initPieces(): void {
    this._pieces = [];
    for (let p = 0; p < this._playerCount; p++) {
      const colour = COLOURS[p]!;
      for (let i = 0; i < PIECES_PER_PLAYER; i++) {
        this._pieces.push({
          colour,
          index: i,
          state: PieceState.YARD,
          trackPosition: -1,
          homeColumnPosition: -1,
        });
      }
    }
  }

  get state(): GameState {
    return {
      pieces: this._pieces.map(p => ({ ...p })),
      currentPlayerIndex: this._currentPlayerIndex,
      diceValue: this._diceValue,
      playerCount: this._playerCount,
      winner: this._winner,
      turnPhase: this._winner ? 'GAME_OVER' : this._diceValue === null ? 'ROLL' : 'MOVE',
    };
  }

  get currentColour(): Colour {
    return COLOURS[this._currentPlayerIndex]!;
  }

  rollDice(): number {
    if (this._winner) throw new Error('Game is over');
    if (this._diceValue !== null) throw new Error('Dice already rolled this turn');

    const value = this._diceRoller();
    if (value < 1 || value > 6 || !Number.isInteger(value)) {
      throw new Error('Dice roller must return an integer between 1 and 6');
    }
    this._diceValue = value;

    const movable = this.getMovablePieces();
    if (movable.length === 0) {
      this._diceValue = null;
      this._advanceTurn();
    }

    return value;
  }

  getMovablePieces(): number[] {
    if (this._diceValue === null) return [];
    const colour = this.currentColour;
    const dice = this._diceValue;
    const result: number[] = [];

    for (let i = 0; i < this._pieces.length; i++) {
      const piece = this._pieces[i]!;
      if (piece.colour !== colour) continue;
      if (this._canMove(piece, dice)) {
        result.push(i);
      }
    }
    return result;
  }

  movePiece(pieceIndex: number): MoveResult {
    if (this._winner) throw new Error('Game is over');
    if (this._diceValue === null) throw new Error('Must roll dice before moving');

    const piece = this._pieces[pieceIndex];
    if (!piece) throw new Error('Invalid piece index');
    if (piece.colour !== this.currentColour) throw new Error('Not your piece');
    if (!this._canMove(piece, this._diceValue)) throw new Error('Cannot move this piece');

    const from = {
      state: piece.state,
      trackPosition: piece.trackPosition,
      homeColumnPosition: piece.homeColumnPosition,
    };

    let captured: MoveResult['captured'] = null;
    const dice = this._diceValue;

    if (piece.state === PieceState.YARD) {
      piece.state = PieceState.ACTIVE;
      piece.trackPosition = START_POSITIONS[piece.colour];
      captured = this._checkCapture(piece, pieceIndex);
    } else if (piece.state === PieceState.ACTIVE) {
      const relPos = this._relativePosition(piece);
      const newRel = relPos + dice;
      const homeEntryRel = this._homeEntryRelative(piece.colour);

      if (relPos <= homeEntryRel && newRel > homeEntryRel) {
        const homeSteps = newRel - homeEntryRel - 1;
        piece.state = PieceState.HOME_COLUMN;
        piece.trackPosition = -1;
        piece.homeColumnPosition = homeSteps;
        if (piece.homeColumnPosition === HOME_COLUMN_LENGTH - 1) {
          piece.state = PieceState.FINISHED;
        }
      } else {
        piece.trackPosition = this._absoluteFromRelative(piece.colour, newRel % TRACK_LENGTH);
        captured = this._checkCapture(piece, pieceIndex);
      }
    } else if (piece.state === PieceState.HOME_COLUMN) {
      piece.homeColumnPosition += dice;
      if (piece.homeColumnPosition === HOME_COLUMN_LENGTH - 1) {
        piece.state = PieceState.FINISHED;
      }
    }

    const to = {
      state: piece.state,
      trackPosition: piece.trackPosition,
      homeColumnPosition: piece.homeColumnPosition,
    };

    const finished = piece.state === PieceState.FINISHED;

    if (this._checkWin(piece.colour)) {
      this._winner = piece.colour;
    }

    const rolledSix = dice === 6;
    this._diceValue = null;

    if (!this._winner) {
      if (!rolledSix) {
        this._advanceTurn();
      }
    }

    return { pieceIndex, from, to, captured, finished };
  }

  private _canMove(piece: Piece, dice: number): boolean {
    if (piece.state === PieceState.FINISHED) return false;

    if (piece.state === PieceState.YARD) {
      return dice === 6;
    }

    if (piece.state === PieceState.ACTIVE) {
      const relPos = this._relativePosition(piece);
      const newRel = relPos + dice;
      const homeEntryRel = this._homeEntryRelative(piece.colour);

      if (relPos <= homeEntryRel && newRel > homeEntryRel) {
        const homeSteps = newRel - homeEntryRel - 1;
        return homeSteps < HOME_COLUMN_LENGTH;
      }
      return true;
    }

    if (piece.state === PieceState.HOME_COLUMN) {
      const newPos = piece.homeColumnPosition + dice;
      return newPos < HOME_COLUMN_LENGTH;
    }

    return false;
  }

  private _relativePosition(piece: Piece): number {
    const start = START_POSITIONS[piece.colour];
    let rel = piece.trackPosition - start;
    if (rel < 0) rel += TRACK_LENGTH;
    return rel;
  }

  private _homeEntryRelative(colour: Colour): number {
    const start = START_POSITIONS[colour];
    const entry = HOME_ENTRY_POSITIONS[colour];
    let rel = entry - start;
    if (rel < 0) rel += TRACK_LENGTH;
    return rel;
  }

  private _absoluteFromRelative(colour: Colour, relPos: number): number {
    return (START_POSITIONS[colour] + relPos) % TRACK_LENGTH;
  }

  private _checkCapture(piece: Piece, pieceIndex: number): MoveResult['captured'] {
    if (SAFE_SQUARES.has(piece.trackPosition)) return null;

    for (let i = 0; i < this._pieces.length; i++) {
      if (i === pieceIndex) continue;
      const other = this._pieces[i]!;
      if (other.colour === piece.colour) continue;
      if (other.state === PieceState.ACTIVE && other.trackPosition === piece.trackPosition) {
        const captured = { colour: other.colour, pieceIndex: other.index };
        other.state = PieceState.YARD;
        other.trackPosition = -1;
        return captured;
      }
    }
    return null;
  }

  private _checkWin(colour: Colour): boolean {
    return this._pieces
      .filter(p => p.colour === colour)
      .every(p => p.state === PieceState.FINISHED);
  }

  private _advanceTurn(): void {
    this._currentPlayerIndex = (this._currentPlayerIndex + 1) % this._playerCount;
  }

  static isSafeSquare(position: number): boolean {
    return SAFE_SQUARES.has(position);
  }

  static getStartPosition(colour: Colour): number {
    return START_POSITIONS[colour];
  }

  static getHomeEntryPosition(colour: Colour): number {
    return HOME_ENTRY_POSITIONS[colour];
  }
}
