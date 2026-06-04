import {
  PLAYERS, PIECES_PER_PLAYER, TRACK_LENGTH, FINISH_LANE_LENGTH,
  getTrackCoords, getFinishLanes, getHomePositions,
  getPlayerStart, getPlayerFinishEntry,
  getPieceCoords, getColorForPlayer, getLightColorForPlayer,
  isSafeCell,
} from './game-engine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL_SIZE = 1;
const BOARD_SIZE = 15;
const PIECE_RADIUS = 0.35;

export function createBoardSVG(container) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Ludo game board');
  svg.id = 'board-svg';

  const defs = document.createElementNS(SVG_NS, 'defs');
  for (let p = 0; p < 4; p++) {
    const grad = document.createElementNS(SVG_NS, 'radialGradient');
    grad.id = `piece-grad-${p}`;
    const stop1 = document.createElementNS(SVG_NS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', lighten(getColorForPlayer(p), 40));
    const stop2 = document.createElementNS(SVG_NS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', getColorForPlayer(p));
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
  }
  svg.appendChild(defs);

  const boardGroup = document.createElementNS(SVG_NS, 'g');
  boardGroup.id = 'board-cells';
  svg.appendChild(boardGroup);

  drawBackground(boardGroup);
  drawHomeAreas(boardGroup);
  drawCenter(boardGroup);
  drawTrackCells(boardGroup);
  drawFinishLanes(boardGroup);
  drawHomeBases(boardGroup);

  const piecesGroup = document.createElementNS(SVG_NS, 'g');
  piecesGroup.id = 'pieces-group';
  svg.appendChild(piecesGroup);

  container.appendChild(svg);
  return svg;
}

function lighten(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `rgb(${r},${g},${b})`;
}

function drawBackground(group) {
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', 0);
  bg.setAttribute('y', 0);
  bg.setAttribute('width', BOARD_SIZE);
  bg.setAttribute('height', BOARD_SIZE);
  bg.setAttribute('fill', '#F5F5F5');
  bg.setAttribute('rx', '0.3');
  group.appendChild(bg);
}

function drawHomeAreas(group) {
  const areas = [
    { x: 0, y: 9, color: getLightColorForPlayer(0), border: getColorForPlayer(0) },   // Red bottom-left
    { x: 0, y: 0, color: getLightColorForPlayer(1), border: getColorForPlayer(1) },   // Green top-left
    { x: 9, y: 0, color: getLightColorForPlayer(2), border: getColorForPlayer(2) },   // Yellow top-right
    { x: 9, y: 9, color: getLightColorForPlayer(3), border: getColorForPlayer(3) },   // Blue bottom-right
  ];
  for (const area of areas) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', area.x);
    rect.setAttribute('y', area.y);
    rect.setAttribute('width', 6);
    rect.setAttribute('height', 6);
    rect.setAttribute('fill', area.color);
    rect.setAttribute('stroke', area.border);
    rect.setAttribute('stroke-width', '0.08');
    rect.setAttribute('rx', '0.2');
    group.appendChild(rect);
  }
}

function drawTrackCells(group) {
  const trackCoords = getTrackCoords();
  for (let i = 0; i < trackCoords.length; i++) {
    const [r, c] = trackCoords[i];
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', c);
    rect.setAttribute('y', r);
    rect.setAttribute('width', CELL_SIZE);
    rect.setAttribute('height', CELL_SIZE);
    rect.setAttribute('rx', '0.08');

    let fill = '#FFFFFF';
    let stroke = '#BDBDBD';

    // Color the start cells
    for (let p = 0; p < 4; p++) {
      if (i === getPlayerStart(p)) {
        fill = getLightColorForPlayer(p);
        stroke = getColorForPlayer(p);
        break;
      }
    }

    // Mark safe cells with a star
    if (isSafeCell(i) && !isStartCell(i)) {
      fill = '#FFF8E1';
      stroke = '#FFB300';
    }

    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', '0.04');
    group.appendChild(rect);

    // Start cell arrow indicator
    if (isStartCell(i)) {
      const arrow = document.createElementNS(SVG_NS, 'text');
      arrow.setAttribute('x', c + 0.5);
      arrow.setAttribute('y', r + 0.65);
      arrow.setAttribute('text-anchor', 'middle');
      arrow.setAttribute('font-size', '0.4');
      arrow.setAttribute('fill', stroke);
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '★';
      group.appendChild(arrow);
    }

    if (isSafeCell(i) && !isStartCell(i)) {
      const star = document.createElementNS(SVG_NS, 'text');
      star.setAttribute('x', c + 0.5);
      star.setAttribute('y', r + 0.65);
      star.setAttribute('text-anchor', 'middle');
      star.setAttribute('font-size', '0.35');
      star.setAttribute('fill', '#FFB300');
      star.setAttribute('aria-hidden', 'true');
      star.textContent = '☆';
      group.appendChild(star);
    }
  }
}

function isStartCell(trackIdx) {
  for (let p = 0; p < 4; p++) {
    if (trackIdx === getPlayerStart(p)) return true;
  }
  return false;
}

function drawFinishLanes(group) {
  const lanes = getFinishLanes();
  for (let p = 0; p < 4; p++) {
    const lane = lanes[p];
    for (let i = 0; i < lane.length; i++) {
      const [r, c] = lane[i];
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', c);
      rect.setAttribute('y', r);
      rect.setAttribute('width', CELL_SIZE);
      rect.setAttribute('height', CELL_SIZE);
      rect.setAttribute('fill', getLightColorForPlayer(p));
      rect.setAttribute('stroke', getColorForPlayer(p));
      rect.setAttribute('stroke-width', '0.04');
      rect.setAttribute('rx', '0.08');
      group.appendChild(rect);

      if (i === lane.length - 1) {
        const tri = document.createElementNS(SVG_NS, 'text');
        tri.setAttribute('x', c + 0.5);
        tri.setAttribute('y', r + 0.7);
        tri.setAttribute('text-anchor', 'middle');
        tri.setAttribute('font-size', '0.5');
        tri.setAttribute('fill', getColorForPlayer(p));
        tri.setAttribute('aria-hidden', 'true');
        tri.textContent = '◆';
        group.appendChild(tri);
      }
    }
  }
}

function drawCenter(group) {
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', 6);
  bg.setAttribute('y', 6);
  bg.setAttribute('width', 3);
  bg.setAttribute('height', 3);
  bg.setAttribute('fill', '#E0E0E0');
  group.appendChild(bg);

  const triangles = [
    { points: '6,6 7.5,7.5 9,6', player: 2 },
    { points: '9,6 7.5,7.5 9,9', player: 3 },
    { points: '9,9 7.5,7.5 6,9', player: 0 },
    { points: '6,9 7.5,7.5 6,6', player: 1 },
  ];
  for (const tri of triangles) {
    const poly = document.createElementNS(SVG_NS, 'polygon');
    poly.setAttribute('points', tri.points);
    poly.setAttribute('fill', getColorForPlayer(tri.player));
    poly.setAttribute('stroke', '#FFFFFF');
    poly.setAttribute('stroke-width', '0.06');
    group.appendChild(poly);
  }
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', 7.5);
  circle.setAttribute('cy', 7.5);
  circle.setAttribute('r', 0.5);
  circle.setAttribute('fill', '#FFFFFF');
  circle.setAttribute('stroke', '#9E9E9E');
  circle.setAttribute('stroke-width', '0.04');
  group.appendChild(circle);
}

function drawHomeBases(group) {
  const homes = getHomePositions();
  for (let p = 0; p < 4; p++) {
    // Draw inner white area in home
    const area = [
      { x: 0.8, y: 9.8 },  // Red
      { x: 0.8, y: 0.8 },  // Green
      { x: 9.8, y: 0.8 },  // Yellow
      { x: 9.8, y: 9.8 },  // Blue
    ][p];
    const inner = document.createElementNS(SVG_NS, 'rect');
    inner.setAttribute('x', area.x);
    inner.setAttribute('y', area.y);
    inner.setAttribute('width', 4.4);
    inner.setAttribute('height', 4.4);
    inner.setAttribute('fill', '#FFFFFF');
    inner.setAttribute('stroke', getColorForPlayer(p));
    inner.setAttribute('stroke-width', '0.06');
    inner.setAttribute('rx', '0.3');
    group.appendChild(inner);

    // Draw home circles
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      const [r, c] = homes[p][i];
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', c + 0.5);
      circle.setAttribute('cy', r + 0.5);
      circle.setAttribute('r', 0.45);
      circle.setAttribute('fill', getLightColorForPlayer(p));
      circle.setAttribute('stroke', getColorForPlayer(p));
      circle.setAttribute('stroke-width', '0.04');
      group.appendChild(circle);
    }
  }
}

export function createPieceElements(svg, state) {
  const piecesGroup = svg.querySelector('#pieces-group');
  piecesGroup.innerHTML = '';
  const elements = [];

  for (let idx = 0; idx < state.pieces.length; idx++) {
    const piece = state.pieces[idx];
    const [r, c] = getPieceCoords(piece);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `piece-group player-${piece.player}`);
    g.setAttribute('data-piece-idx', idx);
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${PLAYERS[piece.player]} piece ${piece.index + 1}`);
    g.setAttribute('tabindex', '0');

    const shadow = document.createElementNS(SVG_NS, 'circle');
    shadow.setAttribute('cx', c + 0.5);
    shadow.setAttribute('cy', r + 0.55);
    shadow.setAttribute('r', PIECE_RADIUS);
    shadow.setAttribute('fill', 'rgba(0,0,0,0.15)');
    shadow.setAttribute('class', 'piece-shadow');
    g.appendChild(shadow);

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', c + 0.5);
    circle.setAttribute('cy', r + 0.5);
    circle.setAttribute('r', PIECE_RADIUS);
    circle.setAttribute('fill', `url(#piece-grad-${piece.player})`);
    circle.setAttribute('stroke', '#FFFFFF');
    circle.setAttribute('stroke-width', '0.06');
    circle.setAttribute('class', 'piece-circle');
    g.appendChild(circle);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', c + 0.5);
    label.setAttribute('y', r + 0.58);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '0.3');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', piece.player === 2 ? '#333' : '#FFF');
    label.setAttribute('pointer-events', 'none');
    label.setAttribute('class', 'piece-label');
    label.textContent = piece.index + 1;
    g.appendChild(label);

    piecesGroup.appendChild(g);
    elements.push(g);
  }

  return elements;
}

export function updatePiecePosition(element, row, col) {
  const shadow = element.querySelector('.piece-shadow');
  const circle = element.querySelector('.piece-circle');
  const label = element.querySelector('.piece-label');

  shadow.setAttribute('cx', col + 0.5);
  shadow.setAttribute('cy', row + 0.55);
  circle.setAttribute('cx', col + 0.5);
  circle.setAttribute('cy', row + 0.5);
  label.setAttribute('x', col + 0.5);
  label.setAttribute('y', row + 0.58);
}

export function setPieceHighlight(element, highlighted) {
  if (highlighted) {
    element.classList.add('highlighted');
    element.style.cursor = 'pointer';
  } else {
    element.classList.remove('highlighted');
    element.style.cursor = 'default';
  }
}

export function setPieceDisabled(element, disabled) {
  if (disabled) {
    element.classList.add('disabled');
  } else {
    element.classList.remove('disabled');
  }
}
