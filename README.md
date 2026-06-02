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

## Tech Stack

- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **HTML Canvas** - Board and piece rendering
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
