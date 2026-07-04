import { GameState } from './types';
import type { Player, Obstacle, Collectible } from './types';
import { CONFIG } from './config';
import { createPlayer, updatePlayer, jump, slide } from './player';
import { createObstacle, updateObstacle, isObstacleOffScreen } from './obstacles';
import { createCollectible, updateCollectible, isCollectibleOffScreen, getCollectibleScore } from './collectibles';
import { checkPlayerObstacleCollision, checkPlayerCollectibleCollision } from './collision';
import {
  clearCanvas,
  drawBackground,
  drawPlayer,
  drawObstacle,
  drawCollectible,
  drawHUD,
} from './renderer';

export class ParkourGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private state: GameState = GameState.Start;
  private player: Player = createPlayer();
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private score = 0;
  private distance = 0;
  private highScore = 0;
  private speed = CONFIG.baseSpeed;
  private frameCount = 0;
  private nextObstacleFrame = 0;
  private nextCollectibleFrame = 0;
  private backgroundOffset = 0;
  private animFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CONFIG.canvasWidth;
    this.canvas.height = CONFIG.canvasHeight;
    this.canvas.id = 'game-canvas';
    this.ctx = this.canvas.getContext('2d')!;

    const saved = localStorage.getItem('parkour-highscore');
    if (saved) this.highScore = parseInt(saved, 10) || 0;

    this.buildUI();
    this.bindInput();
    this.showStartScreen();
  }

  private buildUI(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'game-wrapper';

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.textContent = 'Parkour Runner';
    wrapper.appendChild(title);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'canvas-wrap';
    canvasWrap.appendChild(this.canvas);
    wrapper.appendChild(canvasWrap);

    const controls = document.createElement('div');
    controls.className = 'controls-info';
    controls.innerHTML = `
      <span><kbd>Space</kbd> / <kbd>↑</kbd> / <kbd>W</kbd> Jump</span>
      <span><kbd>↓</kbd> / <kbd>S</kbd> Slide</span>
      <span>Tap/Click to Jump</span>
    `;
    wrapper.appendChild(controls);

    this.container.appendChild(wrapper);
  }

  private bindInput(): void {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state === GameState.Start) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (this.state === GameState.GameOver) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.showStartScreen();
      }
      return;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      jump(this.player);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      slide(this.player);
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    e.preventDefault();
    if (this.state === GameState.Start) {
      this.startGame();
      return;
    }
    if (this.state === GameState.GameOver) {
      this.showStartScreen();
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const clickY = e.clientY - canvasRect.top;
    const halfHeight = canvasRect.height / 2;

    if (clickY < halfHeight) {
      jump(this.player);
    } else {
      slide(this.player);
    }
  }

  private showStartScreen(): void {
    this.state = GameState.Start;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.drawStartScreen();
  }

  private drawStartScreen(): void {
    const ctx = this.ctx;
    clearCanvas(ctx);
    drawBackground(ctx, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Parkour Runner', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 60);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('Jump over obstacles, collect items!', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 10);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Press SPACE or Click to Start', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 50);

    if (this.highScore > 0) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`High Score: ${this.highScore}`, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 90);
    }
  }

  private startGame(): void {
    this.state = GameState.Playing;
    this.player = createPlayer();
    this.obstacles = [];
    this.collectibles = [];
    this.score = 0;
    this.distance = 0;
    this.speed = CONFIG.baseSpeed;
    this.frameCount = 0;
    this.backgroundOffset = 0;
    this.nextObstacleFrame = 60;
    this.nextCollectibleFrame = 100;

    this.gameLoop();
  }

  private gameLoop(): void {
    if (this.state !== GameState.Playing) return;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.frameCount++;
    this.distance += this.speed * 0.1;
    this.backgroundOffset += this.speed;

    if (this.speed < CONFIG.maxSpeed) {
      this.speed += CONFIG.speedIncrement;
    }

    updatePlayer(this.player);

    if (this.frameCount >= this.nextObstacleFrame) {
      this.obstacles.push(createObstacle(this.speed));
      const interval = CONFIG.obstacleMinInterval +
        Math.random() * (CONFIG.obstacleMaxInterval - CONFIG.obstacleMinInterval);
      this.nextObstacleFrame = this.frameCount + Math.floor(interval * (CONFIG.baseSpeed / this.speed));
    }

    if (this.frameCount >= this.nextCollectibleFrame) {
      this.collectibles.push(createCollectible());
      const interval = CONFIG.collectibleMinInterval +
        Math.random() * (CONFIG.collectibleMaxInterval - CONFIG.collectibleMinInterval);
      this.nextCollectibleFrame = this.frameCount + Math.floor(interval);
    }

    for (const obstacle of this.obstacles) {
      updateObstacle(obstacle, this.speed);

      if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
        obstacle.passed = true;
        this.score += 5;
      }

      if (checkPlayerObstacleCollision(this.player, obstacle)) {
        this.gameOver();
        return;
      }
    }

    for (const collectible of this.collectibles) {
      updateCollectible(collectible, this.speed);

      if (!collectible.collected && checkPlayerCollectibleCollision(this.player, collectible)) {
        collectible.collected = true;
        this.score += getCollectibleScore(collectible.type);
      }
    }

    this.obstacles = this.obstacles.filter((o) => !isObstacleOffScreen(o));
    this.collectibles = this.collectibles.filter(
      (c) => !isCollectibleOffScreen(c) && !c.collected
    );
  }

  private render(): void {
    const ctx = this.ctx;
    clearCanvas(ctx);
    drawBackground(ctx, this.backgroundOffset);

    for (const obstacle of this.obstacles) {
      drawObstacle(ctx, obstacle);
    }

    for (const collectible of this.collectibles) {
      drawCollectible(ctx, collectible);
    }

    drawPlayer(ctx, this.player);
    drawHUD(ctx, this.score, this.distance, this.highScore);
  }

  private gameOver(): void {
    this.state = GameState.GameOver;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const totalScore = this.score + Math.floor(this.distance);
    if (totalScore > this.highScore) {
      this.highScore = totalScore;
      localStorage.setItem('parkour-highscore', String(this.highScore));
    }

    this.drawGameOverScreen();
  }

  private drawGameOverScreen(): void {
    this.render();

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 60);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    const totalScore = this.score + Math.floor(this.distance);
    ctx.fillText(`Score: ${totalScore}`, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 10);
    ctx.fillText(`Distance: ${Math.floor(this.distance)}m`, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 25);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`High Score: ${this.highScore}`, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 60);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('Press SPACE or Click to Restart', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 100);
  }
}
