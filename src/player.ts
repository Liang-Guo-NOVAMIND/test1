import type { Player } from './types';
import { CONFIG } from './config';

export function createPlayer(): Player {
  return {
    x: 80,
    y: CONFIG.groundY - CONFIG.playerStandingHeight,
    width: 40,
    height: CONFIG.playerStandingHeight,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
  };
}

export function updatePlayer(player: Player): void {
  if (player.isSliding) {
    player.slideTimer--;
    player.height = CONFIG.playerSlidingHeight;
    player.y = CONFIG.groundY - CONFIG.playerSlidingHeight;
    if (player.slideTimer <= 0) {
      player.isSliding = false;
      player.height = CONFIG.playerStandingHeight;
      player.y = CONFIG.groundY - CONFIG.playerStandingHeight;
    }
  }

  if (player.isJumping) {
    player.vy += CONFIG.gravity;
    player.y += player.vy;

    const groundLevel = CONFIG.groundY - player.height;
    if (player.y >= groundLevel) {
      player.y = groundLevel;
      player.vy = 0;
      player.isJumping = false;
    }
  }
}

export function jump(player: Player): void {
  if (!player.isJumping && !player.isSliding) {
    player.isJumping = true;
    player.vy = CONFIG.jumpForce;
  }
}

export function slide(player: Player): void {
  if (!player.isJumping && !player.isSliding) {
    player.isSliding = true;
    player.slideTimer = CONFIG.slideDuration;
    player.height = CONFIG.playerSlidingHeight;
    player.y = CONFIG.groundY - CONFIG.playerSlidingHeight;
  }
}
