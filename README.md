# Parkour Runner

A browser-based endless runner / parkour game built with TypeScript and Vite. The character automatically runs forward while you jump and slide to avoid obstacles and collect items for points.

## Features

- Endless auto-scrolling parkour gameplay
- Jump (Space / Up / W) and slide (Down / S) controls
- Three obstacle types: ground crates, overhead barriers, flying obstacles
- Three collectible types: coins (10pts), stars (25pts), shields (50pts)
- Gradually increasing speed for escalating difficulty
- Start screen and game-over screen with score display
- High score persistence via localStorage
- Touch/click support (tap upper half to jump, lower half to slide)
- Responsive HTML Canvas rendering

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

1. Press Space or click to start
2. Press Space / Up / W to jump over ground obstacles
3. Press Down / S to slide under overhead barriers
4. Collect coins, stars, and shields for bonus points
5. Avoid all obstacles — one hit ends the game
6. Try to beat your high score!

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

- **Vite** — Build tool and dev server
- **TypeScript** — Type-safe JavaScript
- **HTML Canvas** — Game rendering
- **Vitest** — Unit testing
