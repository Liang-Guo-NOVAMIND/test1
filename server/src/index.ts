import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager.js';
import { registerSocketHandlers } from './socket-handler.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const roomManager = new RoomManager();

app.get('/api/rooms', (_req, res) => {
  res.json(roomManager.listRooms());
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params['id']!);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: room.players,
    maxPlayers: room.maxPlayers,
    status: room.status,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

registerSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Ludo server running on port ${PORT}`);
});

export { app, httpServer, io, roomManager };
