'use strict';

// ============================================================
// 飞行棋 - 带动画效果的完整实现
// Animation driven by requestAnimationFrame, no CSS transitions
// ============================================================

const ANIMATION_CONFIG = {
    stepDuration: 120,       // ms per grid step (≤150ms as required)
    kickbackDuration: 100,   // ms per step for kickback animation
    finishFlashCount: 4,     // number of flashes for finish animation
    finishFlashDuration: 150, // ms per flash cycle
    diceRollDuration: 600,   // ms for dice roll animation
    diceShakeAmplitude: 3,   // pixels for dice shake
};

// ============================================================
// Board Layout - Simplified 飞行棋 board
// 4 players: red(0), blue(1), green(2), yellow(3)
// Each player has 4 pieces, a home base, a start position,
// a shared track of 52 cells, and a finish lane of 6 cells
// ============================================================

const PLAYERS = ['red', 'blue', 'green', 'yellow'];
const PLAYER_NAMES = ['红方', '蓝方', '绿方', '黄方'];
const PIECES_PER_PLAYER = 4;
const TRACK_LENGTH = 52;
const FINISH_LANE_LENGTH = 6;

// Board cell positions (pixel coordinates on the 600x600 board)
// Main track: 52 cells arranged in a square loop
function generateTrackPositions() {
    const positions = [];
    const margin = 60;
    const boardSize = 600;
    const cellsPerSide = 13;
    const spacing = (boardSize - 2 * margin) / cellsPerSide;

    // Top edge: left to right (cells 0-12)
    for (let i = 0; i <= cellsPerSide; i++) {
        positions.push({ x: margin + i * spacing, y: margin });
    }
    // Right edge: top to bottom (cells 13-25)
    for (let i = 1; i <= cellsPerSide; i++) {
        positions.push({ x: margin + cellsPerSide * spacing, y: margin + i * spacing });
    }
    // Bottom edge: right to left (cells 26-38)
    for (let i = cellsPerSide - 1; i >= 0; i--) {
        positions.push({ x: margin + i * spacing, y: margin + cellsPerSide * spacing });
    }
    // Left edge: bottom to top (cells 39-51)
    for (let i = cellsPerSide - 1; i >= 1; i--) {
        positions.push({ x: margin, y: margin + i * spacing });
    }

    return positions;
}

// Finish lane positions for each player (toward center)
function generateFinishPositions() {
    const center = 300;
    const margin = 60;
    const boardSize = 600;
    const cellsPerSide = 13;
    const spacing = (boardSize - 2 * margin) / cellsPerSide;
    const finishLanes = [];

    // Red: enters from top-left area, lane goes right toward center
    const redLane = [];
    for (let i = 1; i <= FINISH_LANE_LENGTH; i++) {
        redLane.push({ x: margin + i * spacing, y: margin + spacing });
    }
    finishLanes.push(redLane);

    // Blue: enters from top-right area, lane goes down toward center
    const blueLane = [];
    for (let i = 1; i <= FINISH_LANE_LENGTH; i++) {
        blueLane.push({ x: margin + (cellsPerSide - 1) * spacing, y: margin + i * spacing });
    }
    finishLanes.push(blueLane);

    // Green: enters from bottom-right area, lane goes left toward center
    const greenLane = [];
    for (let i = 1; i <= FINISH_LANE_LENGTH; i++) {
        greenLane.push({ x: margin + (cellsPerSide - i) * spacing, y: margin + (cellsPerSide - 1) * spacing });
    }
    finishLanes.push(greenLane);

    // Yellow: enters from bottom-left area, lane goes up toward center
    const yellowLane = [];
    for (let i = 1; i <= FINISH_LANE_LENGTH; i++) {
        yellowLane.push({ x: margin + spacing, y: margin + (cellsPerSide - i) * spacing });
    }
    finishLanes.push(yellowLane);

    return finishLanes;
}

// Home base positions for each player's 4 pieces
function generateHomePositions() {
    const homes = [];
    // Red: top-left corner
    homes.push([
        { x: 80, y: 480 }, { x: 120, y: 480 },
        { x: 80, y: 520 }, { x: 120, y: 520 }
    ]);
    // Blue: top-right corner
    homes.push([
        { x: 440, y: 80 }, { x: 480, y: 80 },
        { x: 440, y: 120 }, { x: 480, y: 120 }
    ]);
    // Green: bottom-right corner
    homes.push([
        { x: 440, y: 480 }, { x: 480, y: 480 },
        { x: 440, y: 520 }, { x: 480, y: 520 }
    ]);
    // Yellow: bottom-left corner
    homes.push([
        { x: 80, y: 80 }, { x: 120, y: 80 },
        { x: 80, y: 120 }, { x: 120, y: 120 }
    ]);
    return homes;
}

// Start positions on main track for each player
const PLAYER_START_CELLS = [0, 13, 26, 39];
// Entry to finish lane (the cell before branching into finish)
const PLAYER_FINISH_ENTRY = [51, 12, 25, 38];

const trackPositions = generateTrackPositions();
const finishPositions = generateFinishPositions();
const homePositions = generateHomePositions();

// ============================================================
// Game State
// ============================================================

const STATE = {
    currentPlayer: 0,
    diceValue: null,
    isAnimating: false,
    pieces: [],  // [{player, index, state, trackPos, finishPos}]
    // state: 'home' | 'track' | 'finish' | 'finished'
    // trackPos: 0-51 (absolute position on shared track)
    // finishPos: 0-5 (position in finish lane)
};

function initGameState() {
    STATE.pieces = [];
    for (let p = 0; p < PLAYERS.length; p++) {
        for (let i = 0; i < PIECES_PER_PLAYER; i++) {
            STATE.pieces.push({
                player: p,
                index: i,
                state: 'home',
                trackPos: -1,
                finishPos: -1,
            });
        }
    }
    STATE.currentPlayer = 0;
    STATE.diceValue = null;
    STATE.isAnimating = false;
}

// ============================================================
// DOM References & Rendering
// ============================================================

const boardContainer = document.getElementById('board-container');
const gameInfo = document.getElementById('game-info');
const diceBtn = document.getElementById('dice-btn');
const diceDisplay = document.getElementById('dice-display');

let pieceElements = [];

function createBoard() {
    boardContainer.innerHTML = '';

    // Draw main track cells
    trackPositions.forEach((pos, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.left = (pos.x - 18) + 'px';
        cell.style.top = (pos.y - 18) + 'px';
        cell.textContent = i;
        boardContainer.appendChild(cell);
    });

    // Draw finish lanes
    finishPositions.forEach((lane, playerIdx) => {
        lane.forEach((pos) => {
            const cell = document.createElement('div');
            cell.className = 'cell finish';
            cell.style.left = (pos.x - 18) + 'px';
            cell.style.top = (pos.y - 18) + 'px';
            cell.style.borderColor = getPlayerColor(playerIdx);
            cell.style.background = getPlayerLightColor(playerIdx);
            boardContainer.appendChild(cell);
        });
    });

    // Draw home bases
    homePositions.forEach((homes, playerIdx) => {
        homes.forEach((pos) => {
            const cell = document.createElement('div');
            cell.className = 'cell home-' + PLAYERS[playerIdx];
            cell.style.left = (pos.x - 18) + 'px';
            cell.style.top = (pos.y - 18) + 'px';
            boardContainer.appendChild(cell);
        });
    });

    // Create piece elements
    pieceElements = [];
    STATE.pieces.forEach((piece, idx) => {
        const el = document.createElement('div');
        el.className = 'piece ' + PLAYERS[piece.player];
        el.textContent = piece.index + 1;
        el.dataset.pieceIdx = idx;
        el.addEventListener('click', () => onPieceClick(idx));
        boardContainer.appendChild(el);
        pieceElements.push(el);
    });

    updatePiecePositions();
}

function getPlayerColor(playerIdx) {
    return ['#e53935', '#1e88e5', '#43a047', '#fdd835'][playerIdx];
}

function getPlayerLightColor(playerIdx) {
    return ['#ffcdd2', '#bbdefb', '#c8e6c9', '#fff9c4'][playerIdx];
}

function getPiecePosition(piece) {
    if (piece.state === 'home') {
        return homePositions[piece.player][piece.index];
    } else if (piece.state === 'track') {
        return trackPositions[piece.trackPos];
    } else if (piece.state === 'finish') {
        return finishPositions[piece.player][piece.finishPos];
    } else {
        // finished - stay at last finish position
        return finishPositions[piece.player][FINISH_LANE_LENGTH - 1];
    }
}

function updatePiecePositions() {
    STATE.pieces.forEach((piece, idx) => {
        const pos = getPiecePosition(piece);
        const el = pieceElements[idx];
        el.style.left = (pos.x - 14) + 'px';
        el.style.top = (pos.y - 14) + 'px';
        el.style.transform = '';
    });
}

function updateUI() {
    const playerName = PLAYER_NAMES[STATE.currentPlayer];
    const color = getPlayerColor(STATE.currentPlayer);

    if (STATE.isAnimating) {
        gameInfo.innerHTML = `<span class="player-indicator" style="background:${color}"></span>${playerName} 移动中...`;
        diceBtn.disabled = true;
        pieceElements.forEach(el => el.classList.add('disabled'));
    } else if (STATE.diceValue !== null) {
        gameInfo.innerHTML = `<span class="player-indicator" style="background:${color}"></span>${playerName} 掷出了 <b>${STATE.diceValue}</b>，请选择棋子移动`;
        diceBtn.disabled = true;
        updateClickablePieces();
    } else {
        gameInfo.innerHTML = `<span class="player-indicator" style="background:${color}"></span>${playerName} 的回合，请掷骰子`;
        diceBtn.disabled = false;
        pieceElements.forEach(el => el.classList.add('disabled'));
    }
}

function updateClickablePieces() {
    const movable = getMovablePieces(STATE.currentPlayer, STATE.diceValue);
    pieceElements.forEach((el, idx) => {
        if (movable.includes(idx)) {
            el.classList.remove('disabled');
        } else {
            el.classList.add('disabled');
        }
    });
}

// ============================================================
// Game Logic
// ============================================================

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getPlayerTrackPos(player, absolutePos) {
    // Convert absolute track position to player-relative distance from start
    const start = PLAYER_START_CELLS[player];
    let rel = absolutePos - start;
    if (rel < 0) rel += TRACK_LENGTH;
    return rel;
}

function absoluteFromRelative(player, relativePos) {
    return (PLAYER_START_CELLS[player] + relativePos) % TRACK_LENGTH;
}

function canMoveFromHome(diceValue) {
    return diceValue === 6;
}

function getMovablePieces(player, diceValue) {
    const movable = [];
    STATE.pieces.forEach((piece, idx) => {
        if (piece.player !== player) return;
        if (piece.state === 'finished') return;

        if (piece.state === 'home') {
            if (canMoveFromHome(diceValue)) {
                movable.push(idx);
            }
        } else if (piece.state === 'track') {
            const relPos = getPlayerTrackPos(player, piece.trackPos);
            const newRel = relPos + diceValue;
            // Can move along track or enter finish lane
            if (newRel < TRACK_LENGTH) {
                movable.push(idx);
            } else {
                // Check if can enter finish lane
                const finishSteps = newRel - (TRACK_LENGTH - 1);
                if (finishSteps <= FINISH_LANE_LENGTH) {
                    movable.push(idx);
                }
            }
        } else if (piece.state === 'finish') {
            const newFinishPos = piece.finishPos + diceValue;
            if (newFinishPos < FINISH_LANE_LENGTH) {
                movable.push(idx);
            }
        }
    });
    return movable;
}

function findPieceAtTrackPos(trackPos, excludeIdx) {
    return STATE.pieces.findIndex((p, idx) =>
        idx !== excludeIdx && p.state === 'track' && p.trackPos === trackPos
    );
}

// ============================================================
// Animation System - requestAnimationFrame driven
// ============================================================

function animateMovement(pieceIdx, path, onComplete) {
    if (path.length === 0) {
        onComplete();
        return;
    }

    const el = pieceElements[pieceIdx];
    let stepIndex = 0;

    function animateStep() {
        if (stepIndex >= path.length) {
            onComplete();
            return;
        }

        const target = path[stepIndex];
        const startLeft = parseFloat(el.style.left);
        const startTop = parseFloat(el.style.top);
        const endLeft = target.x - 14;
        const endTop = target.y - 14;
        const startTime = performance.now();
        const duration = ANIMATION_CONFIG.stepDuration;

        function frame(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);

            el.style.left = (startLeft + (endLeft - startLeft) * eased) + 'px';
            el.style.top = (startTop + (endTop - startTop) * eased) + 'px';

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                stepIndex++;
                animateStep();
            }
        }

        requestAnimationFrame(frame);
    }

    animateStep();
}

function animateKickback(pieceIdx, fromPos, onComplete) {
    const piece = STATE.pieces[pieceIdx];
    const el = pieceElements[pieceIdx];
    const homePos = homePositions[piece.player][piece.index];

    // Build kickback path: from current position to home with a "bump" effect
    const startPos = trackPositions[fromPos];
    const startTime = performance.now();
    const totalDuration = 400;

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);

        // First half: bump up/scale, second half: fly to home
        let x, y, scale;
        if (progress < 0.2) {
            // Bump up effect
            const p = progress / 0.2;
            x = startPos.x;
            y = startPos.y - 20 * p;
            scale = 1 + 0.3 * p;
        } else {
            // Fly to home with deceleration
            const p = (progress - 0.2) / 0.8;
            const eased = 1 - Math.pow(1 - p, 2);
            x = startPos.x + (homePos.x - startPos.x) * eased;
            y = (startPos.y - 20) + (homePos.y - (startPos.y - 20)) * eased;
            scale = 1.3 - 0.3 * eased;
        }

        el.style.left = (x - 14) + 'px';
        el.style.top = (y - 14) + 'px';
        el.style.transform = `scale(${scale})`;

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            el.style.transform = '';
            piece.state = 'home';
            piece.trackPos = -1;
            onComplete();
        }
    }

    requestAnimationFrame(frame);
}

function animateFinishEntry(pieceIdx, onComplete) {
    const el = pieceElements[pieceIdx];
    const startTime = performance.now();
    const flashCount = ANIMATION_CONFIG.finishFlashCount;
    const flashDuration = ANIMATION_CONFIG.finishFlashDuration;
    const totalDuration = flashCount * flashDuration;

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);

        // Scale pulse + opacity flash
        const cycle = (elapsed % flashDuration) / flashDuration;
        const scale = 1 + 0.3 * Math.sin(cycle * Math.PI);
        const opacity = 0.5 + 0.5 * Math.cos(cycle * Math.PI * 2);

        el.style.transform = `scale(${scale})`;
        el.style.opacity = opacity;

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            el.style.transform = '';
            el.style.opacity = '1';
            onComplete();
        }
    }

    requestAnimationFrame(frame);
}

function animateDiceRoll(finalValue, onComplete) {
    const startTime = performance.now();
    const duration = ANIMATION_CONFIG.diceRollDuration;
    let lastUpdate = 0;

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Shake effect on the dice display
        const shakeX = (Math.random() - 0.5) * ANIMATION_CONFIG.diceShakeAmplitude * (1 - progress);
        const shakeY = (Math.random() - 0.5) * ANIMATION_CONFIG.diceShakeAmplitude * (1 - progress);
        diceDisplay.style.transform = `translate(${shakeX}px, ${shakeY}px)`;

        // Number rolling effect - update every ~50ms
        if (now - lastUpdate > 50) {
            diceDisplay.textContent = Math.floor(Math.random() * 6) + 1;
            lastUpdate = now;
        }

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            diceDisplay.style.transform = '';
            diceDisplay.textContent = finalValue;
            onComplete();
        }
    }

    requestAnimationFrame(frame);
}

// ============================================================
// Game Actions
// ============================================================

function onDiceClick() {
    if (STATE.isAnimating || STATE.diceValue !== null) return;

    const value = rollDice();
    STATE.isAnimating = true;
    updateUI();

    animateDiceRoll(value, () => {
        STATE.diceValue = value;
        STATE.isAnimating = false;

        const movable = getMovablePieces(STATE.currentPlayer, value);
        if (movable.length === 0) {
            gameInfo.innerHTML = `${PLAYER_NAMES[STATE.currentPlayer]} 无法移动，跳过回合`;
            setTimeout(() => nextTurn(), 800);
        } else {
            updateUI();
        }
    });
}

function onPieceClick(pieceIdx) {
    if (STATE.isAnimating) return;
    if (STATE.diceValue === null) return;

    const piece = STATE.pieces[pieceIdx];
    if (piece.player !== STATE.currentPlayer) return;

    const movable = getMovablePieces(STATE.currentPlayer, STATE.diceValue);
    if (!movable.includes(pieceIdx)) return;

    executeMoveWithAnimation(pieceIdx);
}

function executeMoveWithAnimation(pieceIdx) {
    STATE.isAnimating = true;
    updateUI();

    const piece = STATE.pieces[pieceIdx];
    const diceValue = STATE.diceValue;

    if (piece.state === 'home') {
        // Move piece to start position
        const startPos = PLAYER_START_CELLS[piece.player];
        piece.state = 'track';
        piece.trackPos = startPos;

        const path = [trackPositions[startPos]];
        animateMovement(pieceIdx, path, () => {
            checkKickAndFinish(pieceIdx, () => {
                finishMove();
            });
        });
    } else if (piece.state === 'track') {
        const relPos = getPlayerTrackPos(piece.player, piece.trackPos);
        const newRel = relPos + diceValue;

        if (newRel >= TRACK_LENGTH) {
            // Enter finish lane
            const finishSteps = newRel - (TRACK_LENGTH - 1);
            const path = buildTrackPath(piece.trackPos, PLAYER_FINISH_ENTRY[piece.player], piece.player);
            // Add finish lane steps
            for (let i = 0; i < finishSteps; i++) {
                path.push(finishPositions[piece.player][i]);
            }

            animateMovement(pieceIdx, path, () => {
                piece.state = 'finish';
                piece.finishPos = finishSteps - 1;
                piece.trackPos = -1;

                if (piece.finishPos === FINISH_LANE_LENGTH - 1) {
                    piece.state = 'finished';
                    animateFinishEntry(pieceIdx, () => finishMove());
                } else {
                    animateFinishEntry(pieceIdx, () => finishMove());
                }
            });
        } else {
            // Normal track movement
            const newAbsPos = absoluteFromRelative(piece.player, newRel);
            const path = buildTrackPath(piece.trackPos, newAbsPos, piece.player);

            animateMovement(pieceIdx, path, () => {
                piece.trackPos = newAbsPos;
                checkKickAndFinish(pieceIdx, () => {
                    finishMove();
                });
            });
        }
    } else if (piece.state === 'finish') {
        // Move within finish lane
        const newFinishPos = piece.finishPos + diceValue;
        const path = [];
        for (let i = piece.finishPos + 1; i <= newFinishPos; i++) {
            path.push(finishPositions[piece.player][i]);
        }

        animateMovement(pieceIdx, path, () => {
            piece.finishPos = newFinishPos;
            if (piece.finishPos === FINISH_LANE_LENGTH - 1) {
                piece.state = 'finished';
                animateFinishEntry(pieceIdx, () => finishMove());
            } else {
                finishMove();
            }
        });
    }
}

function buildTrackPath(fromAbsPos, toAbsPos, player) {
    const path = [];
    let pos = fromAbsPos;
    while (pos !== toAbsPos) {
        pos = (pos + 1) % TRACK_LENGTH;
        path.push(trackPositions[pos]);
    }
    return path;
}

function checkKickAndFinish(pieceIdx, onComplete) {
    const piece = STATE.pieces[pieceIdx];
    if (piece.state !== 'track') {
        onComplete();
        return;
    }

    // Check if there's an opponent piece at this position
    const kickedIdx = findPieceAtTrackPos(piece.trackPos, pieceIdx);
    if (kickedIdx !== -1) {
        const kickedPiece = STATE.pieces[kickedIdx];
        if (kickedPiece.player !== piece.player) {
            // Kick the opponent piece back to home
            const fromPos = kickedPiece.trackPos;
            animateKickback(kickedIdx, fromPos, onComplete);
            return;
        }
    }
    onComplete();
}

function finishMove() {
    const rolledSix = (STATE.diceValue === 6);
    STATE.diceValue = null;
    STATE.isAnimating = false;

    // Check for winner
    const winner = checkWinner();
    if (winner !== -1) {
        gameInfo.innerHTML = `🎉 ${PLAYER_NAMES[winner]} 获胜！`;
        diceBtn.disabled = true;
        pieceElements.forEach(el => el.classList.add('disabled'));
        return;
    }

    // If rolled 6, same player goes again
    if (rolledSix) {
        updateUI();
    } else {
        nextTurn();
    }
}

function nextTurn() {
    STATE.currentPlayer = (STATE.currentPlayer + 1) % PLAYERS.length;
    STATE.diceValue = null;
    STATE.isAnimating = false;
    updateUI();
}

function checkWinner() {
    for (let p = 0; p < PLAYERS.length; p++) {
        const playerPieces = STATE.pieces.filter(piece => piece.player === p);
        if (playerPieces.every(piece => piece.state === 'finished')) {
            return p;
        }
    }
    return -1;
}

// ============================================================
// Event Listeners & Initialization
// ============================================================

diceBtn.addEventListener('click', onDiceClick);

function init() {
    initGameState();
    createBoard();
    updateUI();
}

init();
