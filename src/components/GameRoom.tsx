import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { RoomState } from '../protocol';
import type { ClientEvents } from '../protocol';
import type { GameState, Piece, PlayerColor } from '../types';
import { COLOR_HEX } from '../types';
import type { MoveResult } from '../engine';
import { Board } from './Board';
import { drawDice, createDiceAnimation, tickDiceAnimation } from '../dice';

interface GameRoomProps {
  room: RoomState;
  gameState: GameState | null;
  diceRoll: { value: number; movablePieceIds: string[] } | null;
  lastMove: { pieceId: string; moveResult: MoveResult } | null;
  socketId: string | null;
  emit: <E extends keyof ClientEvents>(
    event: E,
    ...args: Parameters<ClientEvents[E]>
  ) => void;
  onLeave: () => void;
}

export function GameRoom({
  room,
  gameState,
  diceRoll,
  lastMove,
  socketId,
  emit,
  onLeave,
}: GameRoomProps) {
  const [highlightedPieces, setHighlightedPieces] = useState<Set<string>>(
    new Set<string>(),
  );
  const [message, setMessage] = useState<string>('');
  const [diceDisplay, setDiceDisplay] = useState<number | null>(null);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const diceCanvasRef = useRef<HTMLCanvasElement>(null);
  const diceTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const isHost = socketId === room.hostId;
  const myPlayer = room.players.find((p) => p.id === socketId);
  const myColor = myPlayer?.color;

  const isMyTurn = useMemo(() => {
    if (!gameState || !myColor) return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer?.color === myColor;
  }, [gameState, myColor]);

  const canRoll = isMyTurn && gameState?.phase === 'rolling' && !diceAnimating;
  const isWaiting = !room.started;

  useEffect(() => {
    if (!diceRoll) return;

    setDiceAnimating(true);
    const anim = createDiceAnimation(diceRoll.value, () => {
      setDiceAnimating(false);
      setDiceDisplay(diceRoll.value);

      if (diceRoll.movablePieceIds.length === 0) {
        setMessage('No valid moves — turn skipped');
        setHighlightedPieces(new Set<string>());
      } else if (isMyTurn) {
        if (diceRoll.movablePieceIds.length === 1) {
          emit('move-piece', { pieceId: diceRoll.movablePieceIds[0]! });
          setHighlightedPieces(new Set<string>());
          setMessage('Moving...');
        } else {
          setHighlightedPieces(new Set(diceRoll.movablePieceIds));
          setMessage('Select a piece to move');
        }
      } else {
        setHighlightedPieces(new Set<string>());
        setMessage('');
      }
    });

    diceTimerRef.current = setInterval(() => {
      const val = tickDiceAnimation(anim);
      if (val !== null) {
        setDiceDisplay(val);
      } else {
        clearInterval(diceTimerRef.current);
      }
    }, 80);

    return () => {
      clearInterval(diceTimerRef.current);
    };
  }, [diceRoll, isMyTurn, emit]);

  useEffect(() => {
    if (!lastMove) return;
    setHighlightedPieces(new Set<string>());

    if (lastMove.moveResult.captured.length > 0) {
      setMessage('Captured!');
    } else {
      setMessage('');
    }
  }, [lastMove]);

  useEffect(() => {
    if (gameState?.phase === 'rolling' && isMyTurn && !diceAnimating) {
      setMessage('Your turn — roll the dice!');
      setHighlightedPieces(new Set<string>());
    } else if (gameState?.phase === 'rolling' && !isMyTurn) {
      const current = gameState.players[gameState.currentPlayerIndex];
      setMessage(`${current?.name ?? 'Opponent'}'s turn`);
      setHighlightedPieces(new Set<string>());
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex, isMyTurn, diceAnimating, gameState?.players]);

  useEffect(() => {
    const canvas = diceCanvasRef.current;
    if (!canvas || diceDisplay === null) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 80, 80);
    drawDice(ctx, diceDisplay, 5, 5, 70);
  }, [diceDisplay]);

  const handleRoll = useCallback(() => {
    if (!canRoll) return;
    emit('roll-dice');
  }, [canRoll, emit]);

  const handlePieceClick = useCallback(
    (piece: Piece) => {
      if (!isMyTurn || !highlightedPieces.has(piece.id)) return;
      emit('move-piece', { pieceId: piece.id });
      setHighlightedPieces(new Set<string>());
      setMessage('Moving...');
    },
    [isMyTurn, highlightedPieces, emit],
  );

  const handleStart = useCallback(() => {
    emit('start-game');
  }, [emit]);

  if (isWaiting) {
    return (
      <div className="waiting-room">
        <div className="waiting-card">
          <h2>{room.name}</h2>
          <p className="room-code">
            Room Code: <strong>{room.id}</strong>
          </p>
          <p className="waiting-hint">Share this code with friends to join!</p>

          <div className="player-slots">
            {room.players.map((p) => (
              <div key={p.id} className="player-slot">
                <span
                  className="slot-color"
                  style={{ backgroundColor: COLOR_HEX[p.color] }}
                />
                <span className="slot-name">
                  {p.name}
                  {p.id === room.hostId ? ' (Host)' : ''}
                  {p.id === socketId ? ' (You)' : ''}
                </span>
              </div>
            ))}
            {Array.from({ length: 4 - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="player-slot empty">
                <span className="slot-color empty-color" />
                <span className="slot-name">Waiting for player...</span>
              </div>
            ))}
          </div>

          <div className="waiting-actions">
            {isHost && (
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={room.players.length < 2}
              >
                Start Game
                {room.players.length < 2 ? ' (Need 2+ players)' : ''}
              </button>
            )}
            {!isHost && (
              <p className="waiting-hint">Waiting for host to start...</p>
            )}
            <button className="btn btn-outline" onClick={onLeave}>
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="game-layout">
      <div className="sidebar">
        <div className="status">
          <span
            className="color-dot"
            style={{
              backgroundColor: currentPlayer
                ? COLOR_HEX[currentPlayer.color]
                : '#ccc',
            }}
          />
          <span>
            {currentPlayer?.name ?? '?'}
            {currentPlayer?.color === myColor ? ' (You)' : ''}'s Turn
          </span>
        </div>

        <div className="dice-area">
          <canvas
            ref={diceCanvasRef}
            className="dice-canvas"
            width={80}
            height={80}
          />
          <button
            className="dice-btn"
            onClick={handleRoll}
            disabled={!canRoll}
          >
            {canRoll ? 'Roll Dice' : isMyTurn ? 'Rolling...' : 'Wait...'}
          </button>
        </div>

        {message && <div className="message">{message}</div>}

        <div className="player-list">
          {gameState.players.map((p) => {
            const won = p.pieces.filter((pc) => pc.position.type === 'won').length;
            const isActive = p.color === currentPlayer?.color;
            const roomPlayer = room.players.find((rp) => rp.color === p.color);
            return (
              <div
                key={p.color}
                className={`player-row ${isActive ? 'active' : ''}`}
              >
                <span
                  className="color-dot"
                  style={{ backgroundColor: COLOR_HEX[p.color] }}
                />
                <span className="player-name">
                  {p.name}
                  {p.color === myColor ? ' (You)' : ''}
                  {roomPlayer && !roomPlayer.connected ? ' [DC]' : ''}
                </span>
                <span className="player-score">{won}/4</span>
              </div>
            );
          })}
        </div>

        <button className="new-game-btn" onClick={onLeave}>
          Leave Game
        </button>

        {gameState.phase === 'gameover' && (
          <GameOverModal
            rankings={gameState.rankings}
            players={gameState.players}
            myColor={myColor}
            onLeave={onLeave}
          />
        )}
      </div>

      <Board
        gameState={gameState}
        highlightedPieceIds={highlightedPieces}
        onPieceClick={handlePieceClick}
        isMyTurn={isMyTurn}
      />
    </div>
  );
}

function GameOverModal({
  rankings,
  players,
  myColor,
  onLeave,
}: {
  rankings: PlayerColor[];
  players: GameState['players'];
  myColor: PlayerColor | undefined;
  onLeave: () => void;
}) {
  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">
        <h2>Game Over!</h2>
        <div className="rankings">
          {rankings.map((color, i) => {
            const p = players.find((pl) => pl.color === color);
            return (
              <div key={color} className="rank-row">
                <span className="rank-pos">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span
                  className="color-dot"
                  style={{ backgroundColor: COLOR_HEX[color] }}
                />
                <span>
                  {p?.name ?? color}
                  {color === myColor ? ' (You)' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn btn-primary" onClick={onLeave}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
