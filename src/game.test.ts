import { describe, it, expect } from 'vitest';
import { createPlayer, updatePlayer, jump, slide } from './player';
import { createObstacle, updateObstacle, isObstacleOffScreen } from './obstacles';
import { createCollectible, updateCollectible, isCollectibleOffScreen, getCollectibleScore } from './collectibles';
import { checkPlayerObstacleCollision, checkPlayerCollectibleCollision } from './collision';
import { CollectibleType } from './types';
import { CONFIG } from './config';

describe('Player', () => {
  it('creates a player at ground level', () => {
    const player = createPlayer();
    expect(player.x).toBe(80);
    expect(player.y).toBe(CONFIG.groundY - CONFIG.playerStandingHeight);
    expect(player.isJumping).toBe(false);
    expect(player.isSliding).toBe(false);
  });

  it('applies jump force', () => {
    const player = createPlayer();
    jump(player);
    expect(player.isJumping).toBe(true);
    expect(player.vy).toBe(CONFIG.jumpForce);
  });

  it('does not double jump', () => {
    const player = createPlayer();
    jump(player);
    const firstVy = player.vy;
    jump(player);
    expect(player.vy).toBe(firstVy);
  });

  it('applies gravity during jump', () => {
    const player = createPlayer();
    jump(player);
    const initialY = player.y;
    updatePlayer(player);
    expect(player.y).toBeLessThan(initialY);
  });

  it('lands back on ground', () => {
    const player = createPlayer();
    jump(player);
    for (let i = 0; i < 100; i++) {
      updatePlayer(player);
    }
    expect(player.isJumping).toBe(false);
    expect(player.y).toBe(CONFIG.groundY - CONFIG.playerStandingHeight);
  });

  it('slides and reduces height', () => {
    const player = createPlayer();
    slide(player);
    expect(player.isSliding).toBe(true);
    expect(player.height).toBe(CONFIG.playerSlidingHeight);
  });

  it('recovers from slide after timer', () => {
    const player = createPlayer();
    slide(player);
    for (let i = 0; i < CONFIG.slideDuration + 1; i++) {
      updatePlayer(player);
    }
    expect(player.isSliding).toBe(false);
    expect(player.height).toBe(CONFIG.playerStandingHeight);
  });

  it('cannot slide while jumping', () => {
    const player = createPlayer();
    jump(player);
    slide(player);
    expect(player.isSliding).toBe(false);
  });
});

describe('Obstacles', () => {
  it('creates obstacle off-screen to the right', () => {
    const obstacle = createObstacle(CONFIG.baseSpeed);
    expect(obstacle.x).toBeGreaterThanOrEqual(CONFIG.canvasWidth);
  });

  it('moves obstacle to the left', () => {
    const obstacle = createObstacle(CONFIG.baseSpeed);
    const initialX = obstacle.x;
    updateObstacle(obstacle, CONFIG.baseSpeed);
    expect(obstacle.x).toBeLessThan(initialX);
  });

  it('detects off-screen obstacle', () => {
    const obstacle = createObstacle(CONFIG.baseSpeed);
    expect(isObstacleOffScreen(obstacle)).toBe(false);
    obstacle.x = -100;
    expect(isObstacleOffScreen(obstacle)).toBe(true);
  });
});

describe('Collectibles', () => {
  it('creates collectible off-screen to the right', () => {
    const collectible = createCollectible();
    expect(collectible.x).toBeGreaterThanOrEqual(CONFIG.canvasWidth);
  });

  it('moves collectible to the left', () => {
    const collectible = createCollectible();
    const initialX = collectible.x;
    updateCollectible(collectible, CONFIG.baseSpeed);
    expect(collectible.x).toBeLessThan(initialX);
  });

  it('detects off-screen collectible', () => {
    const collectible = createCollectible();
    expect(isCollectibleOffScreen(collectible)).toBe(false);
    collectible.x = -100;
    expect(isCollectibleOffScreen(collectible)).toBe(true);
  });

  it('returns correct scores', () => {
    expect(getCollectibleScore(CollectibleType.Coin)).toBe(10);
    expect(getCollectibleScore(CollectibleType.Star)).toBe(25);
    expect(getCollectibleScore(CollectibleType.Shield)).toBe(50);
  });
});

describe('Collision', () => {
  it('detects player-obstacle collision', () => {
    const player = createPlayer();
    const obstacle = createObstacle(CONFIG.baseSpeed);
    obstacle.x = player.x;
    obstacle.y = player.y;
    obstacle.width = 40;
    obstacle.height = 40;
    expect(checkPlayerObstacleCollision(player, obstacle)).toBe(true);
  });

  it('no collision when obstacle is far away', () => {
    const player = createPlayer();
    const obstacle = createObstacle(CONFIG.baseSpeed);
    expect(checkPlayerObstacleCollision(player, obstacle)).toBe(false);
  });

  it('detects player-collectible collision', () => {
    const player = createPlayer();
    const collectible = createCollectible();
    collectible.x = player.x + player.width / 2;
    collectible.y = player.y + player.height / 2;
    collectible.radius = 20;
    expect(checkPlayerCollectibleCollision(player, collectible)).toBe(true);
  });

  it('no collectible collision when far away', () => {
    const player = createPlayer();
    const collectible = createCollectible();
    expect(checkPlayerCollectibleCollision(player, collectible)).toBe(false);
  });
});
