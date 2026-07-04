import type { GameConfig } from './types';

export const CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 400,
  groundY: 320,
  gravity: 1.2,
  jumpForce: -18,
  baseSpeed: 6,
  speedIncrement: 0.002,
  maxSpeed: 16,
  obstacleMinInterval: 60,
  obstacleMaxInterval: 120,
  collectibleMinInterval: 80,
  collectibleMaxInterval: 160,
  slideDuration: 30,
  playerStandingHeight: 60,
  playerSlidingHeight: 30,
};
