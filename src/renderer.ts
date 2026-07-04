import { ObstacleType, CollectibleType } from './types';
import type { Player, Obstacle, Collectible } from './types';
import { CONFIG } from './config';

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
}

export function drawBackground(ctx: CanvasRenderingContext2D, offset: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.6, '#E0F7FA');
  grad.addColorStop(1, '#A5D6A7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, CONFIG.canvasHeight - CONFIG.groundY);

  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.groundY);
  ctx.lineTo(CONFIG.canvasWidth, CONFIG.groundY);
  ctx.stroke();

  ctx.fillStyle = '#81C784';
  const grassSpacing = 40;
  const numGrass = Math.ceil(CONFIG.canvasWidth / grassSpacing) + 2;
  const grassOffset = -(offset % grassSpacing);
  for (let i = 0; i < numGrass; i++) {
    const gx = grassOffset + i * grassSpacing;
    ctx.beginPath();
    ctx.moveTo(gx, CONFIG.groundY);
    ctx.lineTo(gx + 5, CONFIG.groundY - 10);
    ctx.lineTo(gx + 10, CONFIG.groundY);
    ctx.fill();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.7;
  const cloudOffset = -(offset * 0.3) % CONFIG.canvasWidth;
  drawCloud(ctx, cloudOffset + 100, 60, 50);
  drawCloud(ctx, cloudOffset + 350, 40, 40);
  drawCloud(ctx, cloudOffset + 600, 80, 45);
  drawCloud(ctx, cloudOffset + 850, 50, 35);
  ctx.globalAlpha = 1;
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  ctx.save();

  if (player.isSliding) {
    ctx.fillStyle = '#FF5722';
    const rx = player.x;
    const ry = player.y;
    const rw = player.width + 10;
    const rh = player.height;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 8);
    ctx.fill();

    ctx.fillStyle = '#FFCCBC';
    ctx.beginPath();
    ctx.arc(rx + rw - 12, ry + rh / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(rx + rw - 9, ry + rh / 2 - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.roundRect(player.x + 5, player.y + 20, 30, 30, 4);
    ctx.fill();

    ctx.fillStyle = '#FFCCBC';
    ctx.beginPath();
    ctx.arc(player.x + 20, player.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(player.x + 23, player.y + 10, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(player.x + 10, player.y + 50, 8, 10);
    ctx.fillRect(player.x + 22, player.y + 50, 8, 10);

    ctx.fillStyle = '#FFCCBC';
    const armAngle = player.isJumping ? -0.5 : Math.sin(Date.now() / 100) * 0.3;
    ctx.save();
    ctx.translate(player.x + 8, player.y + 25);
    ctx.rotate(armAngle);
    ctx.fillRect(-3, 0, 6, 18);
    ctx.restore();

    ctx.save();
    ctx.translate(player.x + 32, player.y + 25);
    ctx.rotate(-armAngle);
    ctx.fillRect(-3, 0, 6, 18);
    ctx.restore();
  }

  ctx.restore();
}

export function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle): void {
  ctx.save();

  switch (obstacle.type) {
    case ObstacleType.Low: {
      ctx.fillStyle = '#795548';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.width - 4, 6);
      ctx.strokeStyle = '#4E342E';
      ctx.lineWidth = 1;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      break;
    }
    case ObstacleType.High: {
      ctx.fillStyle = '#F44336';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#D32F2F';
      for (let i = 0; i < obstacle.width; i += 12) {
        ctx.fillRect(obstacle.x + i, obstacle.y, 6, obstacle.height);
      }
      ctx.fillStyle = '#FFC107';
      const triW = 8;
      for (let i = 0; i < obstacle.width; i += triW * 2) {
        ctx.beginPath();
        ctx.moveTo(obstacle.x + i, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x + i + triW, obstacle.y + obstacle.height - 8);
        ctx.lineTo(obstacle.x + i + triW * 2, obstacle.y + obstacle.height);
        ctx.fill();
      }
      break;
    }
    case ObstacleType.Flying: {
      ctx.fillStyle = '#9C27B0';
      ctx.beginPath();
      ctx.ellipse(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width / 2,
        obstacle.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = '#CE93D8';
      ctx.beginPath();
      const wx = obstacle.x + obstacle.width / 2;
      const wy = obstacle.y + obstacle.height / 2;
      ctx.moveTo(wx - obstacle.width / 2 - 10, wy);
      ctx.quadraticCurveTo(wx - obstacle.width / 4, wy - 15, wx, wy);
      ctx.quadraticCurveTo(wx + obstacle.width / 4, wy - 15, wx + obstacle.width / 2 + 10, wy);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

export function drawCollectible(ctx: CanvasRenderingContext2D, collectible: Collectible): void {
  ctx.save();

  const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
  const r = collectible.radius * pulse;

  switch (collectible.type) {
    case CollectibleType.Coin: {
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(collectible.x, collectible.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFA000';
      ctx.font = `bold ${r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', collectible.x, collectible.y + 1);
      break;
    }
    case CollectibleType.Star: {
      ctx.fillStyle = '#FFEB3B';
      ctx.strokeStyle = '#F9A825';
      ctx.lineWidth = 1.5;
      drawStar(ctx, collectible.x, collectible.y, 5, r, r * 0.5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case CollectibleType.Shield: {
      ctx.fillStyle = '#2196F3';
      ctx.strokeStyle = '#1565C0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sx = collectible.x;
      const sy = collectible.y - r;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + r, sy, sx + r, sy + r);
      ctx.quadraticCurveTo(sx + r, sy + r * 1.5, sx, sy + r * 2);
      ctx.quadraticCurveTo(sx - r, sy + r * 1.5, sx - r, sy + r);
      ctx.quadraticCurveTo(sx - r, sy, sx, sy);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
): void {
  ctx.beginPath();
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  distance: number,
  highScore: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 200, 70);
  ctx.beginPath();
  ctx.roundRect(10, 10, 200, 70, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 20, 32);
  ctx.fillText(`Distance: ${Math.floor(distance)}m`, 20, 52);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`Best: ${highScore}`, 20, 70);
  ctx.restore();
}
