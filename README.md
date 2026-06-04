# Ludo

A browser-based local multiplayer Ludo board game for 2-4 players, built with TypeScript and Vite. All game logic runs client-side with no backend required.

## Features

- 2-4 player local multiplayer on the same device
- Animated dice rolling and piece movement
- Standard Ludo rules: safe cells, captures, bonus turns on 6 or capture
- Three consecutive sixes penalty (turn lost)
- Player setup screen with customizable names
- Responsive board rendered on HTML Canvas
- Game over screen with final rankings

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## How to Play

1. Select the number of players (2-4) and enter names
2. Click "Roll Dice" to roll
3. If a 6 is rolled, a piece can leave the home area
4. Click a highlighted piece to move it
5. Landing on an opponent sends them home (bonus turn)
6. Rolling a 6 grants a bonus turn (but 3 sixes in a row = turn lost)
7. First player to get all 4 pieces to the center wins

## Scripts

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Start Vite development server       |
| `npm run build`      | Type-check and build for production |
| `npm run preview`    | Preview the production build        |
| `npm run test`       | Run unit tests with Vitest          |
| `npm run test:watch` | Run tests in watch mode             |
| `npm run lint`       | Lint TypeScript files with ESLint   |
| `npm run format`     | Format source files with Prettier   |

## Game Server

The `server/` directory contains a Node.js backend with Express and Socket.IO that provides:

- **Room management** — create, join, leave rooms for 2-4 players
- **Authoritative game state** — server-side Ludo engine with dice rolling, piece movement validation, captures, bonus turns, three-sixes penalty, and win detection
- **WebSocket sync** — real-time state broadcasts to all room participants
- **REST API** — `GET /api/rooms` (list), `GET /api/rooms/:id` (details), `GET /api/health`

### Starting the server

```bash
cd server
npm install
npm run dev      # development with auto-reload (default port 3001)
npm start        # production start
npm test         # run unit + integration tests
```

Set `PORT` environment variable to change the listening port (default: `3001`).

### Socket.IO Events

| Event (client → server) | Payload | Description |
|---|---|---|
| `room:create` | `{ playerName, roomName, maxPlayers? }` | Create a new room |
| `room:join` | `{ roomId, playerName }` | Join an existing room |
| `room:leave` | — | Leave the current room |
| `rooms:list` | — | List all rooms |
| `game:start` | — | Start the game (host only) |
| `game:rollDice` | — | Roll the dice (current player) |
| `game:movePiece` | `{ pieceIndex }` | Move a piece (current player) |

| Event (server → client) | Description |
|---|---|
| `rooms:updated` | Room list changed |
| `room:playerJoined` | A player joined the room |
| `room:playerLeft` | A player left the room |
| `room:closed` | Room was deleted |
| `game:started` | Game began, includes initial snapshot |
| `game:diceRolled` | Dice was rolled, includes new snapshot |
| `game:pieceMoved` | Piece was moved, includes move result and snapshot |
| `game:over` | Game finished, includes winner and rankings |

## Tech Stack

- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **HTML Canvas** - Board and piece rendering
- **Express + Socket.IO** - Game server and real-time communication
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
