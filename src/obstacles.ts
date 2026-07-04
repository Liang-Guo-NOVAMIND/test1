import { ObstacleType } from './types';
import type { Obstacle } from './types';
import { CONFIG } from './config';

export function createObstacle(speed: number): Obstacle {
  const rand = Math.random();
  let type: ObstacleType;
  let width: number;
  let height: number;
  let y: number;

  if (rand < 0.4) {
    type = ObstacleType.Low;
    width = 30 + Math.random() * 20;
    height = 40 + Math.random() * 20;
    y = CONFIG.groundY - height;
  } else if (rand < 0.7) {
    type = ObstacleType.High;
    width = 60 + Math.random() * 30;
    height = 30;
    y = CONFIG.groundY - 80 - Math.random() * 20;
  } else {
    type = ObstacleType.Flying;
    width = 35 + Math.random() * 15;
    height = 30 + Math.random() * 10;
    y = CONFIG.groundY - 100 - Math.random() * 60;
  }

  void speed;

  return {
    x: CONFIG.canvasWidth + 50,
    y,
    width,
    height,
    type,
    passed: false,
  };
}

export function updateObstacle(obstacle: Obstacle, speed: number): void {
  obstacle.x -= speed;
}

export function isObstacleOffScreen(obstacle: Obstacle): boolean {
  return obstacle.x + obstacle.width < -10;
}
