import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './room-manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('createRoom', () => {
    it('creates a room with the player as host', () => {
      const room = manager.createRoom('socket-1', 'Alice', 'Test Room');
      expect(room.id).toBeTruthy();
      expect(room.name).toBe('Test Room');
      expect(room.hostSocketId).toBe('socket-1');
      expect(room.players).toHaveLength(1);
      expect(room.players[0]!.name).toBe('Alice');
      expect(room.players[0]!.color).toBe('red');
      expect(room.started).toBe(false);
    });

    it('uses default room name if empty', () => {
      const room = manager.createRoom('socket-1', 'Alice', '');
      expect(room.name).toBe("Alice's Game");
    });
  });

  describe('joinRoom', () => {
    it('adds a player to an existing room', () => {
      const room = manager.createRoom('socket-1', 'Alice', 'Room');
      const result = manager.joinRoom(room.id, 'socket-2', 'Bob');
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.players).toHaveLength(2);
        expect(result.players[1]!.name).toBe('Bob');
        expect(result.players[1]!.color).toBe('green');
      }
    });

    it('returns error for non-existent room', () => {
      const result = manager.joinRoom('INVALID', 'socket-2', 'Bob');
      expect(result).toBe('Room not found');
    });

    it('returns error when room is full', () => {
      const room = manager.createRoom('s1', 'A', 'R');
      manager.joinRoom(room.id, 's2', 'B');
      manager.joinRoom(room.id, 's3', 'C');
      manager.joinRoom(room.id, 's4', 'D');
      const result = manager.joinRoom(room.id, 's5', 'E');
      expect(result).toBe('Room is full');
    });
  });

  describe('startGame', () => {
    it('starts a game with 2+ players', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      const result = manager.startGame('s1');
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.state.players).toHaveLength(2);
        expect(result.state.phase).toBe('rolling');
        expect(result.room.started).toBe(true);
      }
    });

    it('rejects start from non-host', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      const result = manager.startGame('s2');
      expect(result).toBe('Only the host can start');
    });

    it('rejects start with only 1 player', () => {
      manager.createRoom('s1', 'Alice', 'R');
      const result = manager.startGame('s1');
      expect(result).toBe('Need at least 2 players');
    });
  });

  describe('leaveRoom', () => {
    it('removes player from room', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      const result = manager.leaveRoom('s2');
      expect(result).not.toBeNull();
      expect(result!.room.players).toHaveLength(1);
      expect(result!.removed).toBe(false);
    });

    it('deletes room when last player leaves', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      const result = manager.leaveRoom('s1');
      expect(result!.removed).toBe(true);
      expect(manager.getRoomById(room.id)).toBeNull();
    });

    it('transfers host when host leaves', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      manager.leaveRoom('s1');
      const updated = manager.getRoomById(room.id);
      expect(updated!.hostSocketId).toBe('s2');
    });
  });

  describe('listRooms', () => {
    it('lists all rooms', () => {
      manager.createRoom('s1', 'Alice', 'Room 1');
      manager.createRoom('s2', 'Bob', 'Room 2');
      const list = manager.listRooms();
      expect(list).toHaveLength(2);
      expect(list[0]!.name).toBe('Room 1');
      expect(list[1]!.name).toBe('Room 2');
    });
  });

  describe('game flow', () => {
    it('handles dice roll and move', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      manager.startGame('s1');

      const rollResult = manager.handleRollDice('s1');
      expect(typeof rollResult).not.toBe('string');
      if (typeof rollResult !== 'string') {
        expect(rollResult.value).toBeGreaterThanOrEqual(1);
        expect(rollResult.value).toBeLessThanOrEqual(6);
      }
    });

    it('rejects roll from wrong player', () => {
      const room = manager.createRoom('s1', 'Alice', 'R');
      manager.joinRoom(room.id, 's2', 'Bob');
      manager.startGame('s1');

      const result = manager.handleRollDice('s2');
      expect(result).toBe('Not your turn');
    });
  });
});
