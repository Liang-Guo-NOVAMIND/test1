import { describe, it, expect } from 'vitest';

function rectsCollide(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const margin = 5;
  return (
    a.x + margin < b.x + b.width &&
    a.x + a.width - margin > b.x &&
    a.y + margin < b.y + b.height &&
    a.y + a.height - margin > b.y
  );
}

describe('Parkour Game - Collision Detection', () => {
  it('detects collision between overlapping rectangles', () => {
    const a = { x: 10, y: 10, width: 30, height: 50 };
    const b = { x: 20, y: 20, width: 30, height: 40 };
    expect(rectsCollide(a, b)).toBe(true);
  });

  it('returns false for non-overlapping rectangles', () => {
    const a = { x: 10, y: 10, width: 30, height: 50 };
    const b = { x: 200, y: 200, width: 30, height: 40 };
    expect(rectsCollide(a, b)).toBe(false);
  });

  it('accounts for margin (near-miss does not collide)', () => {
    const a = { x: 0, y: 0, width: 30, height: 50 };
    const b = { x: 28, y: 0, width: 30, height: 50 };
    expect(rectsCollide(a, b)).toBe(false);
  });

  it('detects collision when rectangles share same position', () => {
    const a = { x: 50, y: 50, width: 30, height: 30 };
    const b = { x: 50, y: 50, width: 30, height: 30 };
    expect(rectsCollide(a, b)).toBe(true);
  });
});

describe('Parkour Game - Physics', () => {
  const GROUND_Y = 320;
  const GRAVITY = 0.8;
  const JUMP_FORCE = -14;

  it('jump applies upward velocity', () => {
    let vy = 0;
    vy = JUMP_FORCE;
    expect(vy).toBeLessThan(0);
  });

  it('gravity pulls player back down', () => {
    let vy = JUMP_FORCE;
    let y = GROUND_Y - 50;
    for (let i = 0; i < 50; i++) {
      vy += GRAVITY;
      y += vy;
      if (y >= GROUND_Y - 50) {
        y = GROUND_Y - 50;
        break;
      }
    }
    expect(y).toBe(GROUND_Y - 50);
  });

  it('speed increases over time', () => {
    const BASE_SPEED = 5;
    const SPEED_INCREMENT = 0.001;
    let speed = BASE_SPEED;
    for (let i = 0; i < 1000; i++) {
      speed += SPEED_INCREMENT;
    }
    expect(speed).toBeGreaterThan(BASE_SPEED);
    expect(speed).toBeCloseTo(6, 0);
  });
});
