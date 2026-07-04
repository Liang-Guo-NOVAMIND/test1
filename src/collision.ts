import type { Player, Obstacle, Collectible } from './types';

export function checkPlayerObstacleCollision(player: Player, obstacle: Obstacle): boolean {
  const px = player.x;
  const py = player.y;
  const pw = player.width;
  const ph = player.height;

  const ox = obstacle.x;
  const oy = obstacle.y;
  const ow = obstacle.width;
  const oh = obstacle.height;

  const shrink = 6;
  return (
    px + shrink < ox + ow &&
    px + pw - shrink > ox &&
    py + shrink < oy + oh &&
    py + ph - shrink > oy
  );
}

export function checkPlayerCollectibleCollision(player: Player, collectible: Collectible): boolean {
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;

  const dx = pcx - collectible.x;
  const dy = pcy - collectible.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist < collectible.radius + Math.min(player.width, player.height) / 2;
}
