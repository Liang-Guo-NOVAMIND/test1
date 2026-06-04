import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents, RoomState } from '../protocol';
import type { GameState } from '../types';
import type { MoveResult } from '../engine';
import { Lobby } from './Lobby';
import { GameRoom } from './GameRoom';

type AppSocket = Socket<ServerEvents, ClientEvents>;

function createSocket(): AppSocket {
  const url =
    import.meta.env.VITE_SERVER_URL ??
    `${window.location.protocol}//${window.location.hostname}:3001`;
  return io(url, { autoConnect: false });
}

type View = 'lobby' | 'room';

export function App() {
  const socketRef = useRef<AppSocket | null>(null);
  const [view, setView] = useState<View>('lobby');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [diceRoll, setDiceRoll] = useState<{
    value: number;
    movablePieceIds: string[];
  } | null>(null);
  const [lastMove, setLastMove] = useState<{
    pieceId: string;
    moveResult: MoveResult;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketId(socket.id ?? null);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room-joined', ({ room: roomData }) => {
      setRoom(roomData);
      setView('room');
      setGameState(roomData.gameState);
    });

    socket.on('room-updated', (roomData) => {
      setRoom(roomData);
    });

    socket.on('game-started', (state) => {
      setGameState(state);
      setDiceRoll(null);
      setLastMove(null);
      setRoom((prev) => (prev ? { ...prev, started: true, gameState: state } : null));
    });

    socket.on('game-state', (state) => {
      setGameState(state);
    });

    socket.on('dice-rolled', (data) => {
      setDiceRoll({ value: data.value, movablePieceIds: data.movablePieceIds });
      setLastMove(null);
    });

    socket.on('piece-moved', ({ pieceId, moveResult, state }) => {
      setLastMove({ pieceId, moveResult });
      setGameState(state);
      setDiceRoll(null);
    });

    socket.on('turn-skipped', (state) => {
      setGameState(state);
      setDiceRoll(null);
      setLastMove(null);
    });

    socket.on('game-over', ({ state }) => {
      setGameState(state);
    });

    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const emit = useCallback(
    <E extends keyof ClientEvents>(
      event: E,
      ...args: Parameters<ClientEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    [],
  );

  const handleLeaveRoom = useCallback(() => {
    emit('leave-room');
    setView('lobby');
    setRoom(null);
    setGameState(null);
    setDiceRoll(null);
    setLastMove(null);
  }, [emit]);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Ludo 飞行棋</h1>
        <div className="connection-status">
          <span
            className={`status-dot ${connected ? 'connected' : 'disconnected'}`}
          />
          {connected ? 'Online' : 'Connecting...'}
        </div>
      </header>

      {errorMsg && <div className="error-toast">{errorMsg}</div>}

      {view === 'lobby' && (
        <Lobby socket={socketRef.current} emit={emit} connected={connected} />
      )}

      {view === 'room' && room && (
        <GameRoom
          room={room}
          gameState={gameState}
          diceRoll={diceRoll}
          lastMove={lastMove}
          socketId={socketId}
          emit={emit}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}
