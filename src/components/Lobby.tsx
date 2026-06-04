import { useState, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents, RoomInfo } from '../protocol';

type AppSocket = Socket<ServerEvents, ClientEvents>;

interface LobbyProps {
  socket: AppSocket | null;
  emit: <E extends keyof ClientEvents>(
    event: E,
    ...args: Parameters<ClientEvents[E]>
  ) => void;
  connected: boolean;
}

export function Lobby({ socket, emit, connected }: LobbyProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomList = (list: RoomInfo[]) => {
      setRooms(list);
    };

    socket.on('room-list', handleRoomList);

    if (connected) {
      emit('list-rooms');
    }

    return () => {
      socket.off('room-list', handleRoomList);
    };
  }, [socket, connected, emit]);

  const handleCreate = useCallback(() => {
    if (!playerName.trim()) return;
    emit('create-room', {
      playerName: playerName.trim(),
      roomName: roomName.trim(),
    });
  }, [emit, playerName, roomName]);

  const handleJoinById = useCallback(() => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    emit('join-room', {
      roomId: joinRoomId.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  }, [emit, playerName, joinRoomId]);

  const handleJoinFromList = useCallback(
    (roomId: string) => {
      if (!playerName.trim()) return;
      emit('join-room', {
        roomId,
        playerName: playerName.trim(),
      });
    },
    [emit, playerName],
  );

  const handleRefresh = useCallback(() => {
    emit('list-rooms');
  }, [emit]);

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h2>Join or Create a Game</h2>

        <div className="lobby-form">
          <label className="lobby-label">Your Name</label>
          <input
            className="lobby-input"
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="lobby-actions">
          <div className="lobby-form">
            <label className="lobby-label">Room Name (optional)</label>
            <input
              className="lobby-input"
              type="text"
              placeholder="My Awesome Game"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!connected || !playerName.trim()}
          >
            Create Room
          </button>

          <div className="lobby-divider">
            <span>or</span>
          </div>

          {showJoinInput ? (
            <div className="join-by-code">
              <input
                className="lobby-input code-input"
                type="text"
                placeholder="Room Code"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                className="btn btn-secondary"
                onClick={handleJoinById}
                disabled={
                  !connected || !playerName.trim() || !joinRoomId.trim()
                }
              >
                Join
              </button>
              <button
                className="btn btn-text"
                onClick={() => setShowJoinInput(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn btn-outline"
              onClick={() => setShowJoinInput(true)}
            >
              Join by Code
            </button>
          )}
        </div>
      </div>

      <div className="room-list-card">
        <div className="room-list-header">
          <h3>Open Rooms</h3>
          <button className="btn btn-text" onClick={handleRefresh}>
            Refresh
          </button>
        </div>

        {rooms.filter((r) => !r.started).length === 0 ? (
          <p className="room-list-empty">
            No open rooms. Create one to get started!
          </p>
        ) : (
          <div className="room-list">
            {rooms
              .filter((r) => !r.started)
              .map((r) => (
                <div key={r.id} className="room-list-item">
                  <div className="room-info">
                    <span className="room-name-text">{r.name}</span>
                    <span className="room-meta">
                      Code: {r.id} &middot; Host: {r.hostName} &middot;{' '}
                      {r.playerCount}/{r.maxPlayers} players
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleJoinFromList(r.id)}
                    disabled={!connected || !playerName.trim()}
                  >
                    Join
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
