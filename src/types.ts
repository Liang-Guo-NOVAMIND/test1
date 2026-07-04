export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
}

export const enum ObstacleType {
  Low = 0,
  High = 1,
  Flying = 2,
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
}

export const enum CollectibleType {
  Coin = 0,
  Star = 1,
  Shield = 2,
}

export interface Collectible {
  x: number;
  y: number;
  radius: number;
  type: CollectibleType;
  collected: boolean;
}

export const enum GameState {
  Start = 0,
  Playing = 1,
  GameOver = 2,
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundY: number;
  gravity: number;
  jumpForce: number;
  baseSpeed: number;
  speedIncrement: number;
  maxSpeed: number;
  obstacleMinInterval: number;
  obstacleMaxInterval: number;
  collectibleMinInterval: number;
  collectibleMaxInterval: number;
  slideDuration: number;
  playerStandingHeight: number;
  playerSlidingHeight: number;
}
