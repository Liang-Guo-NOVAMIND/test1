import { CollectibleType } from './types';
import type { Collectible } from './types';
import { CONFIG } from './config';

export function createCollectible(): Collectible {
  const rand = Math.random();
  let type: CollectibleType;
  let radius: number;

  if (rand < 0.6) {
    type = CollectibleType.Coin;
    radius = 12;
  } else if (rand < 0.85) {
    type = CollectibleType.Star;
    radius = 14;
  } else {
    type = CollectibleType.Shield;
    radius = 16;
  }

  const minY = CONFIG.groundY - 160;
  const maxY = CONFIG.groundY - 40;
  const y = minY + Math.random() * (maxY - minY);

  return {
    x: CONFIG.canvasWidth + 50 + Math.random() * 100,
    y,
    radius,
    type,
    collected: false,
  };
}

export function updateCollectible(collectible: Collectible, speed: number): void {
  collectible.x -= speed;
}

export function isCollectibleOffScreen(collectible: Collectible): boolean {
  return collectible.x + collectible.radius < -10;
}

export function getCollectibleScore(type: CollectibleType): number {
  switch (type) {
    case CollectibleType.Coin:
      return 10;
    case CollectibleType.Star:
      return 25;
    case CollectibleType.Shield:
      return 50;
  }
}
