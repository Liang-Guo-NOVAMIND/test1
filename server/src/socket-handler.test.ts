import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from './room-manager.js';
import { registerSocketHandlers } from './socket-handler.js';
import type { AddressInfo } from 'node:net';

function connect(port: number): ClientSocket {
  return ioClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
}

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (data: T) => resolve(data));
  });
}

describe('Socket.IO handler', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let roomManager: RoomManager;
  let port: number;
  const clients: ClientSocket[] = [];

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        httpServer = createServer();
        io = new Server(httpServer);
        roomManager = new RoomManager();
        registerSocketHandlers(io, roomManager);
        httpServer.listen(0, () => {
          port = (httpServer.address() as AddressInfo).port;
          resolve();
        });
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        for (const c of clients) c.disconnect();
        io.close();
        httpServer.close(() => resolve());
      })
  );

  beforeEach(() => {
    // Clean up any rooms from previous tests
    for (const room of roomManager.listRooms()) {
      roomManager.removeRoom(room.id);
    }
  });

  function newClient(): ClientSocket {
    const c = connect(port);
    clients.push(c);
    return c;
  }

  it('creates a room via socket event', async () => {
    const client = newClient();
    await new Promise<void>((resolve) => client.on('connect', resolve));

    const res = await new Promise<{ ok: boolean; room?: { id: string; name: string } }>(
      (resolve) => {
        client.emit(
          'room:create',
          { playerName: 'Alice', roomName: 'Test', maxPlayers: 2 },
          resolve
        );
      }
    );

    expect(res.ok).toBe(true);
    expect(res.room!.name).toBe('Test');
  });

  it('joins a room and notifies others', async () => {
    const host = newClient();
    const joiner = newClient();
    await Promise.all([
      new Promise<void>((r) => host.on('connect', r)),
      new Promise<void>((r) => joiner.on('connect', r)),
    ]);

    const createRes = await new Promise<{ ok: boolean; room: { id: string } }>(
      (resolve) => {
        host.emit(
          'room:create',
          { playerName: 'Alice', roomName: 'R', maxPlayers: 2 },
          resolve
        );
      }
    );

    const joinedPromise = waitFor<{
      room: { players: { name: string }[] };
    }>(host, 'room:playerJoined');

    const joinRes = await new Promise<{ ok: boolean; room: { id: string } }>(
      (resolve) => {
        joiner.emit(
          'room:join',
          { roomId: createRes.room.id, playerName: 'Bob' },
          resolve
        );
      }
    );

    expect(joinRes.ok).toBe(true);

    const notification = await joinedPromise;
    expect(notification.room.players).toHaveLength(2);
  });

  it('starts a game and broadcasts to room', async () => {
    const host = newClient();
    const joiner = newClient();
    await Promise.all([
      new Promise<void>((r) => host.on('connect', r)),
      new Promise<void>((r) => joiner.on('connect', r)),
    ]);

    const createRes = await new Promise<{ ok: boolean; room: { id: string } }>(
      (resolve) => {
        host.emit(
          'room:create',
          { playerName: 'Alice', roomName: 'R', maxPlayers: 2 },
          resolve
        );
      }
    );

    await new Promise<{ ok: boolean }>((resolve) => {
      joiner.emit(
        'room:join',
        { roomId: createRes.room.id, playerName: 'Bob' },
        resolve
      );
    });

    const startedPromise = waitFor<{
      snapshot: { turnPhase: string; playerCount: number };
    }>(joiner, 'game:started');

    const startRes = await new Promise<{
      ok: boolean;
      snapshot: { turnPhase: string };
    }>((resolve) => {
      host.emit('game:start', resolve);
    });

    expect(startRes.ok).toBe(true);
    expect(startRes.snapshot.turnPhase).toBe('ROLL');

    const started = await startedPromise;
    expect(started.snapshot.playerCount).toBe(2);
  });

  it('lists rooms via socket event', async () => {
    const client = newClient();
    await new Promise<void>((r) => client.on('connect', r));

    await new Promise<{ ok: boolean }>((resolve) => {
      client.emit(
        'room:create',
        { playerName: 'X', roomName: 'Listed', maxPlayers: 3 },
        resolve
      );
    });

    const listRes = await new Promise<{
      ok: boolean;
      rooms: { name: string }[];
    }>((resolve) => {
      client.emit('rooms:list', resolve);
    });

    expect(listRes.ok).toBe(true);
    expect(listRes.rooms.some((r) => r.name === 'Listed')).toBe(true);
  });

  it('handles disconnect by removing player from room', async () => {
    const host = newClient();
    const joiner = newClient();
    await Promise.all([
      new Promise<void>((r) => host.on('connect', r)),
      new Promise<void>((r) => joiner.on('connect', r)),
    ]);

    const createRes = await new Promise<{ ok: boolean; room: { id: string } }>(
      (resolve) => {
        host.emit(
          'room:create',
          { playerName: 'Alice', roomName: 'R', maxPlayers: 2 },
          resolve
        );
      }
    );

    await new Promise<{ ok: boolean }>((resolve) => {
      joiner.emit(
        'room:join',
        { roomId: createRes.room.id, playerName: 'Bob' },
        resolve
      );
    });

    const leftPromise = waitFor<{
      room: { players: { name: string }[] };
    }>(host, 'room:playerLeft');

    joiner.disconnect();

    const left = await leftPromise;
    expect(left.room.players).toHaveLength(1);
    expect(left.room.players[0]!.name).toBe('Alice');
  });
});
