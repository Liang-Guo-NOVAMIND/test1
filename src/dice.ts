const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.25, 0.25],
    [0.75, 0.75],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.5],
    [0.75, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
};

export function drawDice(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  size: number
): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 2;

  const r = 8;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const dots = DOT_POSITIONS[value];
  if (!dots) return;

  ctx.fillStyle = '#212121';
  const dotRadius = size * 0.08;
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(x + size * dx, y + size * dy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface DiceAnimation {
  frames: number[];
  currentFrame: number;
  finalValue: number;
  onComplete: (value: number) => void;
}

export function createDiceAnimation(
  finalValue: number,
  onComplete: (value: number) => void
): DiceAnimation {
  const frames: number[] = [];
  const frameCount = 12;
  for (let i = 0; i < frameCount; i++) {
    frames.push(Math.floor(Math.random() * 6) + 1);
  }
  frames.push(finalValue);

  return {
    frames,
    currentFrame: 0,
    finalValue,
    onComplete,
  };
}

export function tickDiceAnimation(anim: DiceAnimation): number | null {
  if (anim.currentFrame >= anim.frames.length) return null;
  const value = anim.frames[anim.currentFrame]!;
  anim.currentFrame++;
  if (anim.currentFrame >= anim.frames.length) {
    anim.onComplete(anim.finalValue);
  }
  return value;
}
