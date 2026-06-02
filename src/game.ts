import {
  GameState,
  PlayerColor,
  PLAYER_COLORS,
  COLOR_HEX,
} from './types';
import {
  createGameState,
  rollDice,
  applyMove,
  getMovablePieces,
  hasAnyMove,
  skipTurn,
  computeMove,
} from './engine';
import {
  renderLoop,
  getClickedPiece,
  startAnimation,
  isAnimating,
  cancelAnimation,
  getPiecePixel,
  positionToPixel,
} from './renderer';
import { drawDice, createDiceAnimation, tickDiceAnimation, DiceAnimation } from './dice';
import { BOARD_SIZE } from './board-layout';

export class LudoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private diceCanvas: HTMLCanvasElement;
  private diceCtx: CanvasRenderingContext2D;
  private state: GameState;
  private highlightedPieces = new Set<string>();
  private container: HTMLElement;
  private statusEl: HTMLElement;
  private diceBtn: HTMLButtonElement;
  private diceAnim: DiceAnimation | null = null;
  private diceAnimInterval: ReturnType<typeof setInterval> | null = null;
  private displayDiceValue: number = 1;
  private messageEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = createGameState(['red', 'green'], ['Player 1', 'Player 2']);
    this.canvas = document.createElement('canvas');
    this.diceCanvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.diceCtx = this.diceCanvas.getContext('2d')!;
    this.statusEl = document.createElement('div');
    this.diceBtn = document.createElement('button');
    this.messageEl = document.createElement('div');
    this.showSetupScreen();
  }

  private showSetupScreen(): void {
    this.container.innerHTML = '';

    const setup = document.createElement('div');
    setup.className = 'setup-screen';

    const title = document.createElement('h1');
    title.textContent = 'Ludo';
    title.className = 'game-title';
    setup.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Local Multiplayer Board Game';
    subtitle.className = 'game-subtitle';
    setup.appendChild(subtitle);

    const playerCountLabel = document.createElement('label');
    playerCountLabel.textContent = 'Number of Players';
    playerCountLabel.className = 'setup-label';
    setup.appendChild(playerCountLabel);

    const playerCountSelect = document.createElement('div');
    playerCountSelect.className = 'player-count-select';
    let selectedCount = 2;

    for (let n = 2; n <= 4; n++) {
      const btn = document.createElement('button');
      btn.textContent = `${n}`;
      btn.className = 'count-btn' + (n === 2 ? ' active' : '');
      btn.addEventListener('click', () => {
        selectedCount = n;
        playerCountSelect
          .querySelectorAll('.count-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updateNameInputs();
      });
      playerCountSelect.appendChild(btn);
    }
    setup.appendChild(playerCountSelect);

    const namesContainer = document.createElement('div');
    namesContainer.className = 'names-container';
    setup.appendChild(namesContainer);

    const colorLabels: Record<PlayerColor, string> = {
      red: 'Red',
      green: 'Green',
      yellow: 'Yellow',
      blue: 'Blue',
    };

    function updateNameInputs(): void {
      namesContainer.innerHTML = '';
      for (let i = 0; i < selectedCount; i++) {
        const color = PLAYER_COLORS[i]!;
        const row = document.createElement('div');
        row.className = 'name-row';

        const dot = document.createElement('span');
        dot.className = 'color-dot';
        dot.style.background = COLOR_HEX[color];
        row.appendChild(dot);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `${colorLabels[color]} Player`;
        input.value = `Player ${i + 1}`;
        input.className = 'name-input';
        input.id = `player-name-${i}`;
        row.appendChild(input);

        namesContainer.appendChild(row);
      }
    }
    updateNameInputs();

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.className = 'start-btn';
    startBtn.addEventListener('click', () => {
      const colors = PLAYER_COLORS.slice(0, selectedCount);
      const names = colors.map((_, i) => {
        const input = document.getElementById(
          `player-name-${i}`
        ) as HTMLInputElement;
        return input.value.trim() || `Player ${i + 1}`;
      });
      this.startGame(colors, names);
    });
    setup.appendChild(startBtn);

    this.container.appendChild(setup);
  }

  private startGame(colors: PlayerColor[], names: string[]): void {
    this.state = createGameState(colors, names);
    this.highlightedPieces.clear();
    cancelAnimation();
    this.buildGameUI();
    this.updateUI();

    renderLoop(
      this.ctx,
      () => this.state,
      () => this.highlightedPieces
    );
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

    const diceArea = document.createElement('div');
    diceArea.className = 'dice-area';

    this.diceCanvas.width = 80;
    this.diceCanvas.height = 80;
    this.diceCanvas.className = 'dice-canvas';
    diceArea.appendChild(this.diceCanvas);

    this.diceBtn = document.createElement('button');
    this.diceBtn.textContent = 'Roll Dice';
    this.diceBtn.className = 'dice-btn';
    this.diceBtn.addEventListener('click', () => this.onRollDice());
    diceArea.appendChild(this.diceBtn);

    sidebar.appendChild(diceArea);

    this.messageEl = document.createElement('div');
    this.messageEl.className = 'message';
    sidebar.appendChild(this.messageEl);

    const playerList = document.createElement('div');
    playerList.className = 'player-list';
    for (const player of this.state.players) {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.id = `player-row-${player.color}`;

      const dot = document.createElement('span');
      dot.className = 'color-dot';
      dot.style.background = COLOR_HEX[player.color];
      row.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = player.name;
      row.appendChild(name);

      const score = document.createElement('span');
      score.className = 'player-score';
      score.id = `score-${player.color}`;
      row.appendChild(score);

      playerList.appendChild(row);
    }
    sidebar.appendChild(playerList);

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'New Game';
    newGameBtn.className = 'new-game-btn';
    newGameBtn.addEventListener('click', () => {
      cancelAnimation();
      this.showSetupScreen();
    });
    sidebar.appendChild(newGameBtn);

    layout.appendChild(sidebar);

    const boardWrap = document.createElement('div');
    boardWrap.className = 'board-wrap';

    this.canvas.width = BOARD_SIZE;
    this.canvas.height = BOARD_SIZE;
    this.canvas.className = 'board-canvas';
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    boardWrap.appendChild(this.canvas);

    layout.appendChild(boardWrap);

    this.container.appendChild(layout);

    this.drawDiceDisplay(1);
  }

  private drawDiceDisplay(value: number): void {
    this.diceCtx.clearRect(0, 0, 80, 80);
    drawDice(this.diceCtx, value, 10, 10, 60);
  }

  private onRollDice(): void {
    if (this.state.phase !== 'rolling') return;
    if (this.state.diceRolled) return;
    if (isAnimating()) return;

    const value = rollDice();
    this.diceBtn.disabled = true;

    this.diceAnim = createDiceAnimation(value, (finalValue) => {
      this.diceAnimDone(finalValue);
    });

    if (this.diceAnimInterval) clearInterval(this.diceAnimInterval);
    this.diceAnimInterval = setInterval(() => {
      if (!this.diceAnim) return;
      const v = tickDiceAnimation(this.diceAnim);
      if (v !== null) {
        this.displayDiceValue = v;
        this.drawDiceDisplay(v);
      } else {
        if (this.diceAnimInterval) clearInterval(this.diceAnimInterval);
        this.diceAnimInterval = null;
        this.diceAnim = null;
      }
    }, 60);
  }

  private diceAnimDone(value: number): void {
    this.state = {
      ...this.state,
      diceValue: value,
      diceRolled: true,
      phase: 'moving',
    };

    this.displayDiceValue = value;
    this.drawDiceDisplay(value);

    if (!hasAnyMove(this.state)) {
      this.showMessage('No valid moves. Turn skipped.');
      setTimeout(() => {
        this.state = skipTurn(this.state);
        this.clearMessage();
        this.updateUI();
      }, 1200);
      return;
    }

    const movable = getMovablePieces(this.state);
    this.highlightedPieces.clear();
    for (const p of movable) {
      this.highlightedPieces.add(p.id);
    }

    if (movable.length === 1) {
      this.movePiece(movable[0]!.id);
    } else {
      this.showMessage('Select a piece to move');
      this.diceBtn.disabled = true;
    }

    this.updateUI();
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.state.phase !== 'moving') return;
    if (isAnimating()) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const piece = getClickedPiece(this.state, x, y);
    if (piece) {
      this.movePiece(piece.id);
    }
  }

  private movePiece(pieceId: string): void {
    this.highlightedPieces.clear();
    this.clearMessage();

    const player = this.state.players[this.state.currentPlayerIndex]!;
    const piece = player.pieces.find((p) => p.id === pieceId);
    if (!piece || this.state.diceValue === null) return;

    const moveResult = computeMove(piece, this.state.diceValue, this.state);
    const startPos = getPiecePixel(piece);
    const pathPixels = moveResult.path.map((pos) =>
      positionToPixel(piece.color, pos, piece.index)
    );

    const fullPath = [startPos, ...pathPixels];
    void fullPath;

    this.state = { ...this.state, animating: true };

    startAnimation(
      pieceId,
      moveResult.path,
      piece.color,
      piece.index,
      () => {
        const result = applyMove(this.state, pieceId);
        this.state = result.state;

        if (result.moveResult.captured.length > 0) {
          this.showMessage('Captured! Bonus turn!');
          setTimeout(() => this.clearMessage(), 1500);
        } else if (this.state.diceValue === null && this.state.consecutiveSixes > 0) {
          // Rolled a six - gets another turn
        }

        if (this.state.phase === 'gameover') {
          this.showGameOver();
        }

        this.updateUI();
      }
    );
  }

  private updateUI(): void {
    const current = this.state.players[this.state.currentPlayerIndex]!;

    this.statusEl.innerHTML = '';
    const turnDot = document.createElement('span');
    turnDot.className = 'color-dot';
    turnDot.style.background = COLOR_HEX[current.color];
    this.statusEl.appendChild(turnDot);

    const turnText = document.createElement('span');
    turnText.textContent = `${current.name}'s Turn`;
    this.statusEl.appendChild(turnText);

    this.diceBtn.disabled =
      this.state.phase !== 'rolling' || isAnimating();

    for (const player of this.state.players) {
      const row = document.getElementById(`player-row-${player.color}`);
      if (row) {
        row.classList.toggle(
          'active',
          player.color === current.color
        );
      }
      const scoreEl = document.getElementById(`score-${player.color}`);
      if (scoreEl) {
        const home = player.pieces.filter(
          (p) => p.position.type === 'won'
        ).length;
        scoreEl.textContent = home > 0 ? `${home}/4 home` : '';
      }
    }

    this.drawDiceDisplay(this.displayDiceValue);
  }

  private showMessage(msg: string): void {
    this.messageEl.textContent = msg;
  }

  private clearMessage(): void {
    this.messageEl.textContent = '';
  }

  private showGameOver(): void {
    this.diceBtn.disabled = true;

    const overlay = document.createElement('div');
    overlay.className = 'gameover-overlay';

    const modal = document.createElement('div');
    modal.className = 'gameover-modal';

    const title = document.createElement('h2');
    title.textContent = 'Game Over!';
    modal.appendChild(title);

    const rankings = document.createElement('div');
    rankings.className = 'rankings';

    for (let i = 0; i < this.state.rankings.length; i++) {
      const color = this.state.rankings[i]!;
      const player = this.state.players.find((p) => p.color === color)!;
      const row = document.createElement('div');
      row.className = 'rank-row';

      const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : '4th';
      const pos = document.createElement('span');
      pos.className = 'rank-pos';
      pos.textContent = medal;
      row.appendChild(pos);

      const dot = document.createElement('span');
      dot.className = 'color-dot';
      dot.style.background = COLOR_HEX[color];
      row.appendChild(dot);

      const name = document.createElement('span');
      name.textContent = player.name;
      row.appendChild(name);

      rankings.appendChild(row);
    }
    modal.appendChild(rankings);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.className = 'start-btn';
    playAgainBtn.addEventListener('click', () => {
      overlay.remove();
      cancelAnimation();
      this.showSetupScreen();
    });
    modal.appendChild(playAgainBtn);

    overlay.appendChild(modal);
    this.container.appendChild(overlay);
  }
}
