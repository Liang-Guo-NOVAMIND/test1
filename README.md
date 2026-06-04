# Ludo 飞行棋

A browser-based Ludo board game with real-time online multiplayer for 2-4 players. Built with React, TypeScript, Express, and Socket.IO.

## Features

- Real-time online multiplayer via WebSocket (Socket.IO)
- Game room system: create, join by code, or browse open rooms
- 2-4 players per room with automatic color assignment
- Server-authoritative game logic (prevents cheating)
- Animated dice rolling and piece movement
- Standard Ludo rules: safe cells, captures, bonus turns on 6 or capture
- Three consecutive sixes penalty (turn lost)
- Player disconnect/reconnect detection
- Responsive board rendered on HTML Canvas
- Game over screen with final rankings

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

## Getting Started

### 1. Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2. Start the development servers

In one terminal, start the frontend:

```bash
npm run dev
```

In another terminal, start the backend:

```bash
npm run dev:server
```

Open the frontend URL (usually http://localhost:5173). The client connects to the game server on port 3001.

### Production

```bash
npm run build
npm run start:server
```

The server serves the built frontend from the `dist/` directory on port 3001.

## How to Play

1. Enter your name and create a room or join an existing one
2. Share the room code with friends so they can join
3. The host starts the game when 2-4 players have joined
4. On your turn, click "Roll Dice" to roll
5. If a 6 is rolled, a piece can leave the home area
6. Click a highlighted piece to move it
7. Landing on an opponent sends them home (bonus turn)
8. Rolling a 6 grants a bonus turn (but 3 sixes in a row = turn lost)
9. First player to get all 4 pieces to the center wins

## Architecture

```
├── src/                    # Frontend (React + Vite)
│   ├── components/         # React components (App, Lobby, GameRoom, Board)
│   ├── engine.ts           # Game engine (pure logic)
│   ├── board-layout.ts     # Board grid and cell positions
│   ├── renderer.ts         # Canvas rendering utilities
│   ├── dice.ts             # Dice rendering and animation
│   ├── protocol.ts         # Socket.IO event type definitions
│   └── types.ts            # Core game types and constants
├── server/                 # Backend (Express + Socket.IO)
│   └── src/
│       ├── index.ts        # HTTP server + WebSocket handler
│       └── room-manager.ts # Room and game state management
```

## Scripts

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Start Vite development server       |
| `npm run dev:server` | Start game server in watch mode     |
| `npm run build`      | Type-check and build for production |
| `npm run start:server` | Start game server (production)    |
| `npm run test`       | Run unit tests with Vitest          |
| `npm run test:watch` | Run tests in watch mode             |
| `npm run lint`       | Lint TypeScript files with ESLint   |
| `npm run format`     | Format source files with Prettier   |

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **Socket.IO** - Real-time WebSocket communication
- **Express** - HTTP server
- **HTML Canvas** - Board and piece rendering
- **Vitest** - Unit testing
- **ESLint + Prettier** - Linting and formatting
