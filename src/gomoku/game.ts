import { BOARD_SIZE, CellValue, Difficulty, GameMode, GomokuState, Move } from './types';
import { applyMove, createGameState } from './engine';
import { getAIMove } from './ai';

const CELL_PX = 36;
const PADDING = 24;
const CANVAS_SIZE = PADDING * 2 + CELL_PX * (BOARD_SIZE - 1);
const STONE_RADIUS = 15;

export class GomokuGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GomokuState;
  private container: HTMLElement;
  private mode: GameMode = 'pve';
  private difficulty: Difficulty = 'medium';
  private aiPlayer: CellValue = 2;
  private statusEl!: HTMLElement;
  private aiThinking = false;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
    this.state = createGameState();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.showSetupScreen();
  }

  private showSetupScreen(): void {
    this.container.innerHTML = '';

    const setup = document.createElement('div');
    setup.className = 'setup-screen';

    const title = document.createElement('h1');
    title.textContent = 'Gomoku';
    title.className = 'game-title';
    setup.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Five in a Row';
    subtitle.className = 'game-subtitle';
    setup.appendChild(subtitle);

    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Game Mode';
    modeLabel.className = 'setup-label';
    setup.appendChild(modeLabel);

    const modeSelect = document.createElement('div');
    modeSelect.className = 'player-count-select';

    const modes: { value: GameMode; label: string }[] = [
      { value: 'pve', label: 'vs AI' },
      { value: 'pvp', label: 'vs Player' },
    ];

    let difficultyContainer: HTMLElement | null = null;

    for (const m of modes) {
      const btn = document.createElement('button');
      btn.textContent = m.label;
      btn.className = 'count-btn' + (m.value === this.mode ? ' active' : '');
      btn.addEventListener('click', () => {
        this.mode = m.value;
        modeSelect.querySelectorAll('.count-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (difficultyContainer) {
          difficultyContainer.style.display = m.value === 'pve' ? 'block' : 'none';
        }
      });
      modeSelect.appendChild(btn);
    }
    setup.appendChild(modeSelect);

    difficultyContainer = document.createElement('div');
    difficultyContainer.className = 'gomoku-difficulty';
    difficultyContainer.style.display = this.mode === 'pve' ? 'block' : 'none';

    const diffLabel = document.createElement('label');
    diffLabel.textContent = 'AI Difficulty';
    diffLabel.className = 'setup-label';
    difficultyContainer.appendChild(diffLabel);

    const diffSelect = document.createElement('div');
    diffSelect.className = 'player-count-select';

    const difficulties: { value: Difficulty; label: string }[] = [
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' },
    ];

    for (const d of difficulties) {
      const btn = document.createElement('button');
      btn.textContent = d.label;
      btn.className = 'count-btn' + (d.value === this.difficulty ? ' active' : '');
      btn.addEventListener('click', () => {
        this.difficulty = d.value;
        diffSelect.querySelectorAll('.count-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      diffSelect.appendChild(btn);
    }
    difficultyContainer.appendChild(diffSelect);
    setup.appendChild(difficultyContainer);

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.className = 'start-btn';
    startBtn.addEventListener('click', () => this.startGame());
    setup.appendChild(startBtn);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.className = 'new-game-btn';
    backBtn.style.marginTop = '12px';
    backBtn.addEventListener('click', () => this.onBack());
    setup.appendChild(backBtn);

    this.container.appendChild(setup);
  }

  private startGame(): void {
    this.state = createGameState();
    this.aiThinking = false;
    this.buildGameUI();
    this.render();
  }

  private buildGameUI(): void {
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'game-layout';

    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'status';
    sidebar.appendChild(this.statusEl);

    const infoEl = document.createElement('div');
    infoEl.className = 'gomoku-info';
    infoEl.innerHTML = `
      <div class="gomoku-info-row"><span class="gomoku-stone-icon black"></span> Black (Player 1)</div>
      <div class="gomoku-info-row"><span class="gomoku-stone-icon white"></span> White (${this.mode === 'pve' ? 'AI — ' + this.difficulty : 'Player 2'})</div>
    `;
    sidebar.appendChild(infoEl);

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'New Game';
    newGameBtn.className = 'new-game-btn';
    newGameBtn.addEventListener('click', () => this.showSetupScreen());
    sidebar.appendChild(newGameBtn);

    layout.appendChild(sidebar);

    const boardWrap = document.createElement('div');
    boardWrap.className = 'board-wrap';

    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.className = 'board-canvas';
    this.canvas.style.cursor = 'pointer';
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    boardWrap.appendChild(this.canvas);

    layout.appendChild(boardWrap);
    this.container.appendChild(layout);

    this.updateStatus();
  }

  private render(): void {
    const ctx = this.ctx;
    const board = this.state.board;

    ctx.fillStyle = '#dcb35c';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = PADDING + i * CELL_PX;
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_PX, pos);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_PX);
      ctx.stroke();
    }

    const starPoints = [3, 7, 11];
    for (const r of starPoints) {
      for (const c of starPoints) {
        ctx.beginPath();
        ctx.arc(PADDING + c * CELL_PX, PADDING + r * CELL_PX, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
      }
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const val = board[r]![c]!;
        if (val === 0) continue;

        const x = PADDING + c * CELL_PX;
        const y = PADDING + r * CELL_PX;

        ctx.beginPath();
        ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);

        if (val === 1) {
          const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, STONE_RADIUS);
          grad.addColorStop(0, '#555');
          grad.addColorStop(1, '#111');
          ctx.fillStyle = grad;
        } else {
          const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, STONE_RADIUS);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#ccc');
          ctx.fillStyle = grad;
        }
        ctx.fill();
        ctx.strokeStyle = val === 1 ? '#000' : '#888';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (this.state.lastMove) {
      const lm = this.state.lastMove;
      const x = PADDING + lm.col * CELL_PX;
      const y = PADDING + lm.row * CELL_PX;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = this.state.board[lm.row]![lm.col] === 1 ? '#f44' : '#44f';
      ctx.fill();
    }

    if (this.state.winningCells.length > 0) {
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      for (const cell of this.state.winningCells) {
        const x = PADDING + cell.col * CELL_PX;
        const y = PADDING + cell.row * CELL_PX;
        ctx.beginPath();
        ctx.arc(x, y, STONE_RADIUS + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  private updateStatus(): void {
    if (!this.statusEl) return;

    if (this.state.gameOver) {
      if (this.state.winner === 0) {
        this.statusEl.textContent = 'Draw!';
      } else {
        const name = this.state.winner === 1 ? 'Black' : 'White';
        this.statusEl.textContent = `${name} Wins!`;
      }
      this.statusEl.style.fontWeight = '700';
      return;
    }

    if (this.aiThinking) {
      this.statusEl.textContent = 'AI is thinking...';
      return;
    }

    const name = this.state.currentPlayer === 1 ? 'Black' : 'White';
    this.statusEl.textContent = `${name}'s Turn`;
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.state.gameOver) return;
    if (this.aiThinking) return;

    if (this.mode === 'pve' && this.state.currentPlayer === this.aiPlayer) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const col = Math.round((mx - PADDING) / CELL_PX);
    const row = Math.round((my - PADDING) / CELL_PX);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (this.state.board[row]![col] !== 0) return;

    this.placeStone({ row, col });
  }

  private placeStone(move: Move): void {
    this.state = applyMove(this.state, move);
    this.render();
    this.updateStatus();

    if (this.state.gameOver) {
      this.showGameOver();
      return;
    }

    if (this.mode === 'pve' && this.state.currentPlayer === this.aiPlayer) {
      this.aiThinking = true;
      this.updateStatus();
      setTimeout(() => this.doAIMove(), 100);
    }
  }

  private doAIMove(): void {
    const move = getAIMove(this.state.board, this.aiPlayer, this.difficulty);
    this.aiThinking = false;
    this.placeStone(move);
  }

  private showGameOver(): void {
    const overlay = document.createElement('div');
    overlay.className = 'gameover-overlay';

    const modal = document.createElement('div');
    modal.className = 'gameover-modal';

    const title = document.createElement('h2');
    if (this.state.winner === 0) {
      title.textContent = "It's a Draw!";
    } else {
      const winnerName = this.state.winner === 1 ? 'Black' : 'White';
      title.textContent = `${winnerName} Wins!`;
    }
    modal.appendChild(title);

    const moveCountP = document.createElement('p');
    moveCountP.textContent = `Game ended after ${this.state.moveCount} moves`;
    moveCountP.style.color = '#757575';
    moveCountP.style.marginBottom = '20px';
    modal.appendChild(moveCountP);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.className = 'start-btn';
    playAgainBtn.addEventListener('click', () => {
      overlay.remove();
      this.startGame();
    });
    modal.appendChild(playAgainBtn);

    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Back to Menu';
    menuBtn.className = 'new-game-btn';
    menuBtn.style.marginTop = '12px';
    menuBtn.addEventListener('click', () => {
      overlay.remove();
      this.showSetupScreen();
    });
    modal.appendChild(menuBtn);

    overlay.appendChild(modal);
    this.container.appendChild(overlay);
  }
}
