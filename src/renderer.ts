import {
  GameState,
  Piece,
  PiecePosition,
  PlayerColor,
  COLOR_HEX,
  COLOR_HEX_DARK,
  BoardCell,
} from './types';
import {
  drawBoard,
  getTrackCellPixel,
  getFinishCellPixel,
  getHomeCellPixel,
  getCenterPixel,
} from './board-layout';
import { getMovablePieces } from './engine';

const PIECE_RADIUS = 14;

export interface AnimationState {
  pieceId: string;
  path: BoardCell[];
  currentStep: number;
  progress: number;
  onComplete: () => void;
}

let currentAnimation: AnimationState | null = null;
let animFrameId: number | null = null;

export function getPiecePixel(piece: Piece): BoardCell {
  return positionToPixel(piece.color, piece.position, piece.index);
}

export function positionToPixel(
  color: PlayerColor,
  pos: PiecePosition,
  pieceIndex: number
): BoardCell {
  switch (pos.type) {
    case 'home':
      return getHomeCellPixel(color, pieceIndex);
    case 'track':
      return getTrackCellPixel(pos.cell);
    case 'finish':
      return getFinishCellPixel(color, pos.cell);
    case 'won':
      return getCenterPixel();
  }
}

export function startAnimation(
  pieceId: string,
  pathPositions: PiecePosition[],
  color: PlayerColor,
  _pieceIndex: number,
  onComplete: () => void
): void {
  cancelAnimation();

  const path = pathPositions.map((pos) => positionToPixel(color, pos, 0));

  if (path.length === 0) {
    onComplete();
    return;
  }

  currentAnimation = {
    pieceId,
    path,
    currentStep: 0,
    progress: 0,
    onComplete,
  };
}

export function cancelAnimation(): void {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  currentAnimation = null;
}

export function isAnimating(): boolean {
  return currentAnimation !== null;
}

function getAnimatingPiecePosition(): { id: string; pos: BoardCell } | null {
  if (!currentAnimation) return null;

  const anim = currentAnimation;
  const step = anim.currentStep;

  if (step >= anim.path.length) {
    return { id: anim.pieceId, pos: anim.path[anim.path.length - 1]! };
  }

  const target = anim.path[step]!;

  if (step === 0 && anim.progress === 0) {
    return { id: anim.pieceId, pos: target };
  }

  const prev = step > 0 ? anim.path[step - 1]! : target;
  const t = anim.progress;

  return {
    id: anim.pieceId,
    pos: {
      x: prev.x + (target.x - prev.x) * t,
      y: prev.y + (target.y - prev.y) * t,
    },
  };
}

const STEP_DURATION = 120;

export function renderLoop(
  ctx: CanvasRenderingContext2D,
  getState: () => GameState,
  getHighlighted: () => Set<string>
): void {
  let lastTime = 0;

  function frame(time: number): void {
    const dt = time - lastTime;
    lastTime = time;

    if (currentAnimation) {
      currentAnimation.progress += dt / STEP_DURATION;
      if (currentAnimation.progress >= 1) {
        currentAnimation.progress = 0;
        currentAnimation.currentStep++;
        if (currentAnimation.currentStep >= currentAnimation.path.length) {
          const cb = currentAnimation.onComplete;
          currentAnimation = null;
          cb();
        }
      }
    }

    render(ctx, getState(), getHighlighted());
    animFrameId = requestAnimationFrame(frame);
  }

  animFrameId = requestAnimationFrame(frame);
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  highlighted: Set<string>
): void {
  drawBoard(ctx);

  const animPiece = getAnimatingPiecePosition();

  const stackMap = new Map<string, Piece[]>();
  for (const player of state.players) {
    for (const piece of player.pieces) {
      if (animPiece && piece.id === animPiece.id) continue;
      const px = getPiecePixel(piece);
      const key = `${Math.round(px.x)},${Math.round(px.y)}`;
      const stack = stackMap.get(key) ?? [];
      stack.push(piece);
      stackMap.set(key, stack);
    }
  }

  for (const [key, pieces] of stackMap) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    drawPieceStack(ctx, pieces, { x, y }, highlighted);
  }

  if (animPiece) {
    const piece = findPieceById(state, animPiece.id);
    if (piece) {
      drawSinglePiece(ctx, piece, animPiece.pos, false, true);
    }
  }

  const movable = getMovablePieces(state);
  if (movable.length > 0 && !currentAnimation) {
    for (const p of movable) {
      if (highlighted.has(p.id)) {
        const px = getPiecePixel(p);
        drawHighlightRing(ctx, px);
      }
    }
  }
}

function findPieceById(state: GameState, id: string): Piece | null {
  for (const player of state.players) {
    for (const piece of player.pieces) {
      if (piece.id === id) return piece;
    }
  }
  return null;
}

function drawPieceStack(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  pos: BoardCell,
  highlighted: Set<string>
): void {
  if (pieces.length === 1) {
    drawSinglePiece(ctx, pieces[0]!, pos, highlighted.has(pieces[0]!.id));
    return;
  }

  const offsets = getStackOffsets(pieces.length);
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    const off = offsets[i]!;
    drawSinglePiece(
      ctx,
      p,
      { x: pos.x + off.x, y: pos.y + off.y },
      highlighted.has(p.id)
    );
  }
}

function getStackOffsets(
  count: number
): { x: number; y: number }[] {
  const spread = 6;
  if (count === 2)
    return [
      { x: -spread, y: 0 },
      { x: spread, y: 0 },
    ];
  if (count === 3)
    return [
      { x: -spread, y: -spread / 2 },
      { x: spread, y: -spread / 2 },
      { x: 0, y: spread / 2 },
    ];
  return [
    { x: -spread, y: -spread },
    { x: spread, y: -spread },
    { x: -spread, y: spread },
    { x: spread, y: spread },
  ];
}

function drawSinglePiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  pos: BoardCell,
  isHighlighted: boolean,
  isAnimating = false
): void {
  ctx.save();

  if (isHighlighted || isAnimating) {
    ctx.shadowColor = COLOR_HEX[piece.color];
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, PIECE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_HEX[piece.color];
  ctx.fill();
  ctx.strokeStyle = COLOR_HEX_DARK[piece.color];
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, PIECE_RADIUS - 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${piece.index + 1}`, pos.x, pos.y + 1);

  ctx.restore();
}

function drawHighlightRing(
  ctx: CanvasRenderingContext2D,
  pos: BoardCell
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, PIECE_RADIUS + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD600';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function getClickedPiece(
  state: GameState,
  canvasX: number,
  canvasY: number
): Piece | null {
  const movable = getMovablePieces(state);
  let closest: Piece | null = null;
  let closestDist = Infinity;

  for (const piece of movable) {
    const px = getPiecePixel(piece);
    const dx = canvasX - px.x;
    const dy = canvasY - px.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= PIECE_RADIUS + 6 && dist < closestDist) {
      closest = piece;
      closestDist = dist;
    }
  }

  return closest;
}
