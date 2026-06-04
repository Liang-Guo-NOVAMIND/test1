import { useRef, useEffect, useCallback } from 'react';
import type { GameState, Piece } from '../types';
import { drawBoard, BOARD_SIZE } from '../board-layout';
import {
  positionToPixel,
  getClickedPiece,
} from '../renderer';
import { getMovablePieces } from '../engine';

const PIECE_RADIUS = 14;

interface BoardProps {
  gameState: GameState;
  highlightedPieceIds: Set<string>;
  onPieceClick: (piece: Piece) => void;
  isMyTurn: boolean;
}

export function Board({
  gameState,
  highlightedPieceIds,
  onPieceClick,
  isMyTurn,
}: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(gameState);
  const highlightRef = useRef(highlightedPieceIds);

  stateRef.current = gameState;
  highlightRef.current = highlightedPieceIds;

  const renderBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const highlighted = highlightRef.current;

    drawBoard(ctx);

    const stackMap = new Map<string, Piece[]>();
    for (const player of state.players) {
      for (const piece of player.pieces) {
        const px = positionToPixel(piece.color, piece.position, piece.index);
        const key = `${Math.round(px.x)},${Math.round(px.y)}`;
        const stack = stackMap.get(key) ?? [];
        stack.push(piece);
        stackMap.set(key, stack);
      }
    }

    for (const [key, pieces] of stackMap) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      drawPieceStack(ctx, pieces, x, y, highlighted);
    }

    if (isMyTurn) {
      const movable = getMovablePieces(state);
      for (const p of movable) {
        if (highlighted.has(p.id)) {
          const px = positionToPixel(p.color, p.position, p.index);
          drawHighlightRing(ctx, px.x, px.y);
        }
      }
    }
  }, [isMyTurn]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      renderBoard();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [renderBoard]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isMyTurn) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const piece = getClickedPiece(stateRef.current, x, y);
      if (piece && highlightRef.current.has(piece.id)) {
        onPieceClick(piece);
      }
    },
    [isMyTurn, onPieceClick],
  );

  return (
    <div className="board-wrap">
      <canvas
        ref={canvasRef}
        className="board-canvas"
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        onClick={handleClick}
        style={{ cursor: isMyTurn && highlightedPieceIds.size > 0 ? 'pointer' : 'default' }}
      />
    </div>
  );
}

function drawPieceStack(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  x: number,
  y: number,
  highlighted: Set<string>,
): void {
  if (pieces.length === 1) {
    drawSinglePiece(ctx, pieces[0]!, x, y, highlighted.has(pieces[0]!.id));
    return;
  }

  const spread = 6;
  const offsets =
    pieces.length === 2
      ? [
          { x: -spread, y: 0 },
          { x: spread, y: 0 },
        ]
      : pieces.length === 3
        ? [
            { x: -spread, y: -spread / 2 },
            { x: spread, y: -spread / 2 },
            { x: 0, y: spread / 2 },
          ]
        : [
            { x: -spread, y: -spread },
            { x: spread, y: -spread },
            { x: -spread, y: spread },
            { x: spread, y: spread },
          ];

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    const off = offsets[i]!;
    drawSinglePiece(ctx, p, x + off.x, y + off.y, highlighted.has(p.id));
  }
}

const COLOR_HEX: Record<string, string> = {
  red: '#E53935',
  green: '#43A047',
  yellow: '#FDD835',
  blue: '#1E88E5',
};

const COLOR_HEX_DARK: Record<string, string> = {
  red: '#B71C1C',
  green: '#1B5E20',
  yellow: '#F9A825',
  blue: '#0D47A1',
};

function drawSinglePiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  isHighlighted: boolean,
): void {
  ctx.save();

  if (isHighlighted) {
    ctx.shadowColor = COLOR_HEX[piece.color] ?? '#000';
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_HEX[piece.color] ?? '#888';
  ctx.fill();
  ctx.strokeStyle = COLOR_HEX_DARK[piece.color] ?? '#444';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, PIECE_RADIUS - 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${piece.index + 1}`, x, y + 1);

  ctx.restore();
}

function drawHighlightRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, PIECE_RADIUS + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD600';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
