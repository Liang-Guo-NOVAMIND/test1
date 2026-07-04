import {
  BOARD_SIZE,
  createInitialState,
  isValidMove,
  placeStone,
  undo,
  restart,
  type GomokuState,
  type Stone,
} from './gomoku-engine';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PADDING = 1;
const CELL_SIZE = 1;
const BOARD_PX = BOARD_SIZE - 1;
const VIEW_SIZE = BOARD_PX + PADDING * 2;
const STONE_RADIUS = 0.42;

let state: GomokuState = createInitialState();
let svg: SVGSVGElement | null = null;
let stonesGroup: SVGGElement | null = null;

const boardContainer = document.getElementById('board-container')!;
const playerStone = document.getElementById('player-stone')!;
const playerName = document.getElementById('player-name')!;
const gameMessage = document.getElementById('game-message')!;
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
const winnerOverlay = document.getElementById('winner-overlay')!;
const winnerTitle = document.getElementById('winner-title')!;
const winnerStone = document.getElementById('winner-stone')!;
const winnerMessage = document.getElementById('winner-message')!;
const modalRestartBtn = document.getElementById('modal-restart-btn')!;

function createBoardSVG(): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`);
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', 'Gomoku game board');
  s.id = 'board-svg';

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(VIEW_SIZE));
  bg.setAttribute('height', String(VIEW_SIZE));
  bg.setAttribute('fill', '#DEB887');
  bg.setAttribute('rx', '0.3');
  s.appendChild(bg);

  const linesGroup = document.createElementNS(SVG_NS, 'g');
  linesGroup.setAttribute('stroke', '#5D4037');
  linesGroup.setAttribute('stroke-width', '0.04');
  linesGroup.setAttribute('stroke-linecap', 'round');

  for (let i = 0; i < BOARD_SIZE; i++) {
    const hLine = document.createElementNS(SVG_NS, 'line');
    hLine.setAttribute('x1', String(PADDING));
    hLine.setAttribute('y1', String(PADDING + i * CELL_SIZE));
    hLine.setAttribute('x2', String(PADDING + BOARD_PX));
    hLine.setAttribute('y2', String(PADDING + i * CELL_SIZE));
    linesGroup.appendChild(hLine);

    const vLine = document.createElementNS(SVG_NS, 'line');
    vLine.setAttribute('x1', String(PADDING + i * CELL_SIZE));
    vLine.setAttribute('y1', String(PADDING));
    vLine.setAttribute('x2', String(PADDING + i * CELL_SIZE));
    vLine.setAttribute('y2', String(PADDING + BOARD_PX));
    linesGroup.appendChild(vLine);
  }
  s.appendChild(linesGroup);

  const starPoints = [
    [3, 3], [3, 7], [3, 11],
    [7, 3], [7, 7], [7, 11],
    [11, 3], [11, 7], [11, 11],
  ];
  const starsGroup = document.createElementNS(SVG_NS, 'g');
  starsGroup.setAttribute('fill', '#5D4037');
  for (const [r, c] of starPoints) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(PADDING + c! * CELL_SIZE));
    dot.setAttribute('cy', String(PADDING + r! * CELL_SIZE));
    dot.setAttribute('r', '0.1');
    starsGroup.appendChild(dot);
  }
  s.appendChild(starsGroup);

  const stones = document.createElementNS(SVG_NS, 'g');
  stones.id = 'stones-group';
  s.appendChild(stones);

  const clickLayer = document.createElementNS(SVG_NS, 'g');
  clickLayer.id = 'click-layer';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'intersection');
      g.setAttribute('data-row', String(r));
      g.setAttribute('data-col', String(c));

      const hitArea = document.createElementNS(SVG_NS, 'rect');
      hitArea.setAttribute('x', String(PADDING + c * CELL_SIZE - 0.5));
      hitArea.setAttribute('y', String(PADDING + r * CELL_SIZE - 0.5));
      hitArea.setAttribute('width', '1');
      hitArea.setAttribute('height', '1');
      hitArea.setAttribute('fill', 'transparent');
      g.appendChild(hitArea);

      const hover = document.createElementNS(SVG_NS, 'circle');
      hover.setAttribute('cx', String(PADDING + c * CELL_SIZE));
      hover.setAttribute('cy', String(PADDING + r * CELL_SIZE));
      hover.setAttribute('r', String(STONE_RADIUS));
      hover.setAttribute('class', 'hover-stone');
      hover.setAttribute('fill', 'currentColor');
      hover.setAttribute('opacity', '0');
      hover.setAttribute('pointer-events', 'none');
      g.appendChild(hover);

      g.addEventListener('click', () => onIntersectionClick(r, c));

      clickLayer.appendChild(g);
    }
  }
  s.appendChild(clickLayer);

  return s;
}

function onIntersectionClick(row: number, col: number): void {
  if (!isValidMove(state, row, col)) return;
  state = placeStone(state, row, col);
  renderStones();
  updateHUD();

  if (state.gameOver) {
    setTimeout(() => showWinner(), 300);
  }
}

function renderStones(): void {
  if (!stonesGroup) return;
  stonesGroup.innerHTML = '';

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r]![c];
      if (cell === null) continue;

      const isWinning = state.winningCells?.some(
        ([wr, wc]) => wr === r && wc === c,
      );

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', String(PADDING + c * CELL_SIZE));
      circle.setAttribute('cy', String(PADDING + r * CELL_SIZE));
      circle.setAttribute('r', String(STONE_RADIUS));
      circle.setAttribute('class', `stone-piece${isWinning ? ' winning-stone' : ''}`);

      if (cell === 'black') {
        circle.setAttribute('fill', '#222');
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '0.03');
      } else {
        circle.setAttribute('fill', '#F5F5F5');
        circle.setAttribute('stroke', '#999');
        circle.setAttribute('stroke-width', '0.03');
      }

      stonesGroup.appendChild(circle);

      const lastMove = state.history[state.history.length - 1];
      if (lastMove && lastMove.row === r && lastMove.col === c) {
        const marker = document.createElementNS(SVG_NS, 'circle');
        marker.setAttribute('cx', String(PADDING + c * CELL_SIZE));
        marker.setAttribute('cy', String(PADDING + r * CELL_SIZE));
        marker.setAttribute('r', '0.1');
        marker.setAttribute('fill', cell === 'black' ? '#FFF' : '#333');
        marker.setAttribute('opacity', '0.7');
        stonesGroup.appendChild(marker);
      }
    }
  }

  updateHoverColor();
}

function updateHoverColor(): void {
  if (!svg) return;
  const color = state.currentPlayer === 'black' ? '#222' : '#EEE';
  svg.style.color = color;
}

function stoneLabel(s: Stone): string {
  return s === 'black' ? 'Black' : 'White';
}

function updateHUD(): void {
  const p = state.currentPlayer;
  playerStone.classList.toggle('white', p === 'white');
  playerName.textContent = stoneLabel(p);
  undoBtn.disabled = state.history.length === 0;

  if (state.winner) {
    gameMessage.textContent = `${stoneLabel(state.winner)} wins!`;
  } else if (state.gameOver) {
    gameMessage.textContent = 'Draw!';
  } else {
    gameMessage.textContent = `${stoneLabel(p)}'s turn`;
  }
}

function showWinner(): void {
  if (state.winner) {
    winnerTitle.textContent = `${stoneLabel(state.winner)} Wins!`;
    winnerStone.classList.toggle('white', state.winner === 'white');
    winnerMessage.textContent = 'Five in a row!';
  } else {
    winnerTitle.textContent = 'Draw!';
    winnerStone.style.display = 'none';
    winnerMessage.textContent = 'The board is full.';
  }
  winnerOverlay.classList.add('active');
}

function init(): void {
  state = createInitialState();
  if (svg) svg.remove();
  svg = createBoardSVG();
  stonesGroup = svg.querySelector('#stones-group');
  boardContainer.appendChild(svg);
  renderStones();
  updateHUD();
  winnerOverlay.classList.remove('active');
  winnerStone.style.display = '';
}

undoBtn.addEventListener('click', () => {
  state = undo(state);
  renderStones();
  updateHUD();
  winnerOverlay.classList.remove('active');
});

restartBtn.addEventListener('click', () => {
  state = restart();
  renderStones();
  updateHUD();
  winnerOverlay.classList.remove('active');
});

modalRestartBtn.addEventListener('click', () => {
  init();
});

winnerOverlay.addEventListener('click', (e) => {
  if (e.target === winnerOverlay) init();
});

init();
