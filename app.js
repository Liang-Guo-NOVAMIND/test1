import {
  PLAYERS, PLAYER_LABELS, PIECES_PER_PLAYER,
  createInitialState, rollDice, getPieceCoords,
  getMovablePieces, computeMove, applyMove,
  getColorForPlayer, getHomePositions,
} from './game-engine.js';

import {
  createBoardSVG, createPieceElements,
  updatePiecePosition, setPieceHighlight, setPieceDisabled,
} from './board-renderer.js';

const STEP_DURATION = 120;
const DICE_ROLL_DURATION = 600;

let state = createInitialState();
let svg = null;
let pieceElements = [];

const boardContainer = document.getElementById('board-container');
const diceBtn = document.getElementById('dice-btn');
const diceDisplay = document.getElementById('dice-display');
const gameMessage = document.getElementById('game-message');
const playerDot = document.getElementById('player-dot');
const playerName = document.getElementById('player-name');
const winnerOverlay = document.getElementById('winner-overlay');
const winnerTitle = document.getElementById('winner-title');
const winnerDot = document.getElementById('winner-dot');
const restartBtn = document.getElementById('restart-btn');

function init() {
  state = createInitialState();
  if (svg) svg.remove();
  svg = createBoardSVG(boardContainer);
  pieceElements = createPieceElements(svg, state);
  attachPieceListeners();
  updateAllPiecePositions();
  updateHUD();
  winnerOverlay.classList.remove('active');
  diceDisplay.textContent = '?';
  diceDisplay.classList.remove('rolling');
}

function attachPieceListeners() {
  for (let idx = 0; idx < pieceElements.length; idx++) {
    const el = pieceElements[idx];
    el.addEventListener('click', () => onPieceClick(idx));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPieceClick(idx);
      }
    });
  }
}

function updateAllPiecePositions() {
  for (let idx = 0; idx < state.pieces.length; idx++) {
    const [r, c] = getPieceCoords(state.pieces[idx]);
    updatePiecePosition(pieceElements[idx], r, c);
  }
}

function updateHUD() {
  const p = state.currentPlayer;
  const color = getColorForPlayer(p);
  playerDot.style.background = color;
  playerName.textContent = PLAYER_LABELS[p];

  if (state.phase === 'roll') {
    gameMessage.textContent = 'Roll the dice to move';
    diceBtn.disabled = false;
    diceBtn.textContent = 'Roll Dice';
    disableAllPieces();
  } else if (state.phase === 'move') {
    const movable = getMovablePieces(state);
    if (movable.length === 0) {
      gameMessage.textContent = 'No valid moves — skipping turn';
      diceBtn.disabled = true;
      disableAllPieces();
      setTimeout(() => skipTurn(), 800);
    } else {
      gameMessage.textContent = `Rolled ${state.diceValue} — select a piece`;
      diceBtn.disabled = true;
      highlightMovablePieces();
    }
  } else if (state.phase === 'animating') {
    gameMessage.textContent = 'Moving...';
    diceBtn.disabled = true;
    disableAllPieces();
  } else if (state.phase === 'won') {
    showWinner();
  }
}

function disableAllPieces() {
  for (const el of pieceElements) {
    setPieceHighlight(el, false);
    setPieceDisabled(el, true);
  }
}

function highlightMovablePieces() {
  const movable = getMovablePieces(state);
  for (let idx = 0; idx < pieceElements.length; idx++) {
    const isMovable = movable.includes(idx);
    setPieceHighlight(pieceElements[idx], isMovable);
    setPieceDisabled(pieceElements[idx], !isMovable);
  }
}

function skipTurn() {
  state.diceValue = null;
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  state.phase = 'roll';
  diceDisplay.textContent = '?';
  updateHUD();
}

// Dice rolling
diceBtn.addEventListener('click', onDiceClick);

function onDiceClick() {
  if (state.phase !== 'roll') return;
  const value = rollDice();
  state.phase = 'animating';
  diceBtn.disabled = true;
  updateHUD();
  animateDiceRoll(value, () => {
    state.diceValue = value;
    state.phase = 'move';
    updateHUD();
  });
}

function animateDiceRoll(finalValue, onComplete) {
  diceDisplay.classList.add('rolling');
  const startTime = performance.now();
  let lastSwap = 0;

  function frame(now) {
    const elapsed = now - startTime;
    if (now - lastSwap > 60) {
      diceDisplay.textContent = Math.floor(Math.random() * 6) + 1;
      lastSwap = now;
    }
    if (elapsed < DICE_ROLL_DURATION) {
      requestAnimationFrame(frame);
    } else {
      diceDisplay.classList.remove('rolling');
      diceDisplay.textContent = finalValue;
      onComplete();
    }
  }
  requestAnimationFrame(frame);
}

// Piece movement
function onPieceClick(idx) {
  if (state.phase !== 'move') return;
  const piece = state.pieces[idx];
  if (piece.player !== state.currentPlayer) return;
  const movable = getMovablePieces(state);
  if (!movable.includes(idx)) return;

  state.phase = 'animating';
  updateHUD();

  const moveResult = computeMove(state, idx);
  animateMovement(idx, moveResult.path, () => {
    applyMove(state, idx, moveResult);

    if (moveResult.kicked >= 0) {
      animateKickback(moveResult.kicked, () => {
        finishTurn();
      });
    } else {
      finishTurn();
    }
  });
}

function finishTurn() {
  updateAllPiecePositions();
  updateHUD();
}

function animateMovement(pieceIdx, path, onComplete) {
  if (path.length === 0) {
    onComplete();
    return;
  }

  let step = 0;

  function animateStep() {
    if (step >= path.length) {
      onComplete();
      return;
    }

    const [targetR, targetC] = path[step];
    const el = pieceElements[pieceIdx];
    const circle = el.querySelector('.piece-circle');
    const startCX = parseFloat(circle.getAttribute('cx'));
    const startCY = parseFloat(circle.getAttribute('cy'));
    const endCX = targetC + 0.5;
    const endCY = targetR + 0.5;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / STEP_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const cx = startCX + (endCX - startCX) * eased;
      const cy = startCY + (endCY - startCY) * eased;
      updatePiecePosition(el, cy - 0.5, cx - 0.5);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        step++;
        animateStep();
      }
    }
    requestAnimationFrame(frame);
  }

  animateStep();
}

function animateKickback(pieceIdx, onComplete) {
  const piece = state.pieces[pieceIdx];
  const el = pieceElements[pieceIdx];
  const circle = el.querySelector('.piece-circle');
  const startCX = parseFloat(circle.getAttribute('cx'));
  const startCY = parseFloat(circle.getAttribute('cy'));
  const [homeR, homeC] = getHomePositions()[piece.player][piece.index];
  const endCX = homeC + 0.5;
  const endCY = homeR + 0.5;
  const startTime = performance.now();
  const duration = 400;

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    let cx, cy;
    if (progress < 0.2) {
      const p = progress / 0.2;
      cx = startCX;
      cy = startCY - 0.5 * p;
    } else {
      const p = (progress - 0.2) / 0.8;
      const eased = 1 - Math.pow(1 - p, 2);
      cx = startCX + (endCX - startCX) * eased;
      cy = (startCY - 0.5) + (endCY - (startCY - 0.5)) * eased;
    }

    updatePiecePosition(el, cy - 0.5, cx - 0.5);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }
  requestAnimationFrame(frame);
}

// Winner modal
function showWinner() {
  const p = state.winner;
  winnerTitle.textContent = `${PLAYER_LABELS[p]} Wins!`;
  winnerDot.style.background = getColorForPlayer(p);
  winnerOverlay.classList.add('active');
}

restartBtn.addEventListener('click', () => {
  init();
});

winnerOverlay.addEventListener('click', (e) => {
  if (e.target === winnerOverlay) init();
});

// Start
init();
