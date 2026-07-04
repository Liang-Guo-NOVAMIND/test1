const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const WIDTH = 800;
const HEIGHT = 400;
const GROUND_Y = 320;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const BASE_SPEED = 5;
const SPEED_INCREMENT = 0.001;

type GameState = 'start' | 'playing' | 'over';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  jumping: boolean;
  ducking: boolean;
  shielded: boolean;
  shieldTimer: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'crate' | 'spike' | 'bird';
}

interface Item {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'coin' | 'shield';
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

let state: GameState = 'start';
let score = 0;
let highScore = 0;
let speed = BASE_SPEED;
let distance = 0;
let obstacleTimer = 0;
let itemTimer = 0;
let particles: Particle[] = [];

const player: Player = {
  x: 80,
  y: GROUND_Y - 50,
  width: 30,
  height: 50,
  vy: 0,
  jumping: false,
  ducking: false,
  shielded: false,
  shieldTimer: 0,
};

let obstacles: Obstacle[] = [];
let items: Item[] = [];

function resetGame(): void {
  score = 0;
  speed = BASE_SPEED;
  distance = 0;
  obstacleTimer = 0;
  itemTimer = 0;
  obstacles = [];
  items = [];
  particles = [];
  player.y = GROUND_Y - player.height;
  player.vy = 0;
  player.jumping = false;
  player.ducking = false;
  player.shielded = false;
  player.shieldTimer = 0;
  player.height = 50;
}

function jump(): void {
  if (!player.jumping) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
  }
}

function startDuck(): void {
  if (!player.jumping) {
    player.ducking = true;
    player.height = 30;
    player.y = GROUND_Y - 30;
  }
}

function endDuck(): void {
  player.ducking = false;
  player.height = 50;
  player.y = GROUND_Y - 50;
}

function spawnObstacle(): void {
  const types: Obstacle['type'][] = ['crate', 'spike', 'bird'];
  const type = types[Math.floor(Math.random() * types.length)];
  let obs: Obstacle;

  if (type === 'crate') {
    obs = { x: WIDTH, y: GROUND_Y - 40, width: 35, height: 40, type };
  } else if (type === 'spike') {
    obs = { x: WIDTH, y: GROUND_Y - 25, width: 25, height: 25, type };
  } else {
    obs = { x: WIDTH, y: GROUND_Y - 100 - Math.random() * 40, width: 35, height: 25, type };
  }
  obstacles.push(obs);
}

function spawnItem(): void {
  const type: Item['type'] = Math.random() < 0.7 ? 'coin' : 'shield';
  const item: Item = {
    x: WIDTH,
    y: GROUND_Y - 80 - Math.random() * 60,
    width: 20,
    height: 20,
    type,
    collected: false,
  };
  items.push(item);
}

function addParticles(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 1) * 3,
      life: 30 + Math.random() * 20,
      color,
    });
  }
}

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

function update(): void {
  speed += SPEED_INCREMENT;
  distance += speed;
  score = Math.floor(distance / 10);

  // Player physics
  if (player.jumping) {
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= GROUND_Y - player.height) {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.jumping = false;
    }
  }

  // Shield timer
  if (player.shielded) {
    player.shieldTimer--;
    if (player.shieldTimer <= 0) {
      player.shielded = false;
    }
  }

  // Spawn obstacles
  obstacleTimer++;
  if (obstacleTimer > 90 - Math.min(speed * 3, 40)) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  // Spawn items
  itemTimer++;
  if (itemTimer > 120) {
    spawnItem();
    itemTimer = 0;
  }

  // Update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= speed;
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
      continue;
    }
    if (rectsCollide(player, obstacles[i])) {
      if (player.shielded) {
        addParticles(obstacles[i].x, obstacles[i].y, '#00ffff', 8);
        obstacles.splice(i, 1);
      } else {
        state = 'over';
        if (score > highScore) highScore = score;
        addParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff4444', 15);
      }
    }
  }

  // Update items
  for (let i = items.length - 1; i >= 0; i--) {
    items[i].x -= speed;
    if (items[i].x + items[i].width < 0) {
      items.splice(i, 1);
      continue;
    }
    if (!items[i].collected && rectsCollide(player, items[i])) {
      items[i].collected = true;
      if (items[i].type === 'coin') {
        score += 10;
        addParticles(items[i].x, items[i].y, '#ffd700', 6);
      } else {
        player.shielded = true;
        player.shieldTimer = 300;
        addParticles(items[i].x, items[i].y, '#00ffff', 6);
      }
      items.splice(i, 1);
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].x += particles[i].vx;
    particles[i].y += particles[i].vy;
    particles[i].life--;
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground(): void {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(1, '#e0f7fa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Scrolling mountains
  ctx.fillStyle = '#a5d6a7';
  for (let i = 0; i < 5; i++) {
    const offset = ((distance * 0.3 + i * 200) % (WIDTH + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(offset - 80, GROUND_Y);
    ctx.lineTo(offset, GROUND_Y - 80 - i * 10);
    ctx.lineTo(offset + 80, GROUND_Y);
    ctx.fill();
  }

  // Ground
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
  ctx.fillStyle = '#388e3c';
  ctx.fillRect(0, GROUND_Y, WIDTH, 3);
}

function drawPlayer(): void {
  ctx.save();

  // Shield glow
  if (player.shielded) {
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - 3, player.y - 3, player.width + 6, player.height + 6);
  }

  // Body
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Head
  ctx.fillStyle = '#ffccbc';
  ctx.fillRect(player.x + 5, player.y - 10, 20, 15);

  // Eyes
  ctx.fillStyle = '#333';
  ctx.fillRect(player.x + 18, player.y - 6, 4, 4);

  // Running legs animation
  const legOffset = Math.sin(distance * 0.1) * 5;
  ctx.fillStyle = '#333';
  ctx.fillRect(player.x + 5, player.y + player.height, 8, 5 + legOffset);
  ctx.fillRect(player.x + 17, player.y + player.height, 8, 5 - legOffset);

  ctx.restore();
}

function drawObstacles(): void {
  for (const obs of obstacles) {
    if (obs.type === 'crate') {
      ctx.fillStyle = '#795548';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.moveTo(obs.x + obs.width, obs.y);
      ctx.lineTo(obs.x, obs.y + obs.height);
      ctx.stroke();
    } else if (obs.type === 'spike') {
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width / 2, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.lineTo(obs.x, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(obs.x + 5, obs.y + 5, 8, 6);
      // Wing
      ctx.fillStyle = '#555';
      const wingY = Math.sin(distance * 0.2) * 3;
      ctx.fillRect(obs.x + 5, obs.y - 5 + wingY, 25, 5);
    }
  }
}

function drawItems(): void {
  for (const item of items) {
    if (item.collected) continue;
    if (item.type === 'coin') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', item.x + item.width / 2, item.y + item.height / 2 + 4);
    } else {
      ctx.fillStyle = '#00bcd4';
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#006064';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('S', item.x + item.width / 2, item.y + item.height / 2 + 4);
    }
  }
}

function drawParticles(): void {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(): void {
  ctx.fillStyle = '#333';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`得分: ${score}`, 20, 30);
  ctx.fillText(`最高: ${highScore}`, 20, 55);

  if (player.shielded) {
    ctx.fillStyle = '#00bcd4';
    ctx.fillText('护盾激活!', WIDTH - 130, 30);
  }
}

function drawStartScreen(): void {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, '#1a237e');
  grad.addColorStop(1, '#4a148c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('跑酷大冒险', WIDTH / 2, HEIGHT / 2 - 60);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText('按 空格/上键 跳跃 | 按 下键 滑行', WIDTH / 2, HEIGHT / 2);
  ctx.fillText('点击屏幕或按空格开始', WIDTH / 2, HEIGHT / 2 + 40);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#bbb';
  ctx.fillText('收集金币得分，获取护盾抵挡障碍', WIDTH / 2, HEIGHT / 2 + 80);

  // Animated character preview
  const previewY = HEIGHT / 2 - 120 + Math.sin(Date.now() * 0.003) * 10;
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(WIDTH / 2 - 15, previewY, 30, 50);
  ctx.fillStyle = '#ffccbc';
  ctx.fillRect(WIDTH / 2 - 10, previewY - 10, 20, 15);
}

function drawGameOverScreen(): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', WIDTH / 2, HEIGHT / 2 - 50);

  ctx.font = '24px sans-serif';
  ctx.fillText(`得分: ${score}`, WIDTH / 2, HEIGHT / 2);
  ctx.fillText(`最高分: ${highScore}`, WIDTH / 2, HEIGHT / 2 + 35);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText('按空格或点击重新开始', WIDTH / 2, HEIGHT / 2 + 80);
}

function render(): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (state === 'start') {
    drawStartScreen();
  } else if (state === 'playing') {
    drawBackground();
    drawObstacles();
    drawItems();
    drawPlayer();
    drawParticles();
    drawHUD();
  } else {
    drawBackground();
    drawObstacles();
    drawItems();
    drawPlayer();
    drawParticles();
    drawHUD();
    drawGameOverScreen();
  }
}

function gameLoop(): void {
  if (state === 'playing') {
    update();
  }
  render();
  requestAnimationFrame(gameLoop);
}

function handleAction(): void {
  if (state === 'start') {
    state = 'playing';
    resetGame();
  } else if (state === 'over') {
    state = 'playing';
    resetGame();
  } else {
    jump();
  }
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleAction();
  }
  if (e.code === 'ArrowDown' && state === 'playing') {
    e.preventDefault();
    startDuck();
  }
});

document.addEventListener('keyup', (e: KeyboardEvent) => {
  if (e.code === 'ArrowDown') {
    endDuck();
  }
});

canvas.addEventListener('click', () => {
  handleAction();
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  handleAction();
});

gameLoop();
