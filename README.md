# test1

Monorepo for the test1 project, containing a React frontend and Node.js/Express backend.

## Repository Structure

```
├── frontend/          # React + Vite SPA
├── backend/           # Node.js + Express API server
├── docs/              # Architecture notes and ADRs
│   └── adr-001-stack.md
├── server/            # Legacy game server (Socket.IO)
├── src/               # Legacy game client source
└── package.json       # Root workspace config
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

## Getting Started

Install all workspace dependencies from the repo root:

```bash
npm install
```

### Frontend

```bash
npm run dev:frontend
```

Opens a Vite dev server (default: http://localhost:5173).

### Backend

```bash
npm run dev:backend
```

Starts the Express API server (default: http://localhost:3001).

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start root Vite dev server (legacy game) |
| `npm run dev:frontend` | Start frontend workspace dev server    |
| `npm run dev:backend`  | Start backend workspace dev server     |
| `npm run build`      | Build root project                       |
| `npm run build:frontend` | Build frontend workspace              |
| `npm run build:backend`  | Build backend workspace               |
| `npm run test`       | Run root tests                           |
| `npm run test:all`   | Run tests across all workspaces          |
| `npm run lint`       | Lint root project                        |
| `npm run lint:all`   | Lint all workspaces                      |
| `npm run format`     | Format all files with Prettier           |

## Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **Monorepo:** npm workspaces

See [docs/adr-001-stack.md](docs/adr-001-stack.md) for the full decision record.
