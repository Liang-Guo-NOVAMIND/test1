# ADR-001: Technology Stack

## Status

Accepted

## Date

2026-07-28

## Context

The project needs a monorepo structure with separate frontend and backend
workspaces. We need to choose frameworks that support rapid development, have
strong TypeScript support, and align with the existing codebase.

The existing codebase already uses:

- TypeScript with Vite for the frontend game client
- Node.js with Express and Socket.IO for the game server
- ESLint + Prettier for code quality
- Vitest for testing

## Decision

### Frontend: React + Vite

- React is the recommended option per project requirements.
- Vite is already in use and provides fast HMR and build times.
- TypeScript support is first-class in both React and Vite.
- Large ecosystem of libraries and community support.

### Backend: Node.js + Express

- Express is already used in the existing game server (`server/`).
- Keeps the entire stack in TypeScript, reducing context-switching.
- Mature ecosystem with strong middleware support.
- Team familiarity with the existing Express codebase.

### Monorepo: npm workspaces

- Native npm workspaces avoid additional tooling (Turborepo, Nx, Lerna).
- Sufficient for the current project scale.
- Can be upgraded to Turborepo later if build orchestration becomes a bottleneck.

## Consequences

- All team members need TypeScript proficiency for both frontend and backend.
- Shared types can be extracted into a common workspace in the future.
- The existing root-level game code should be migrated into the `frontend/`
  workspace in a follow-up ticket.
