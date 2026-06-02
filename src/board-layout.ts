import { BoardCell, PlayerColor, COLOR_HEX, COLOR_HEX_LIGHT } from './types';

const GRID = 15;
const CELL_SIZE = 40;
export const BOARD_SIZE = GRID * CELL_SIZE;

export function cellToPixel(row: number, col: number): BoardCell {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

type TrackCellDef = { row: number; col: number; color?: PlayerColor };

const TRACK_CELLS: TrackCellDef[] = buildTrackCells();

function buildTrackCells(): TrackCellDef[] {
  const cells: TrackCellDef[] = [];

  // Red start area - bottom-left going up then right then down
  // Cell 0: Red start (row=6, col=1)
  // Going up along column 6 from row 6 to row 0
  cells.push({ row: 6, col: 1, color: 'red' }); // 0 - red start, safe
  cells.push({ row: 6, col: 2 }); // 1
  cells.push({ row: 6, col: 3 }); // 2
  cells.push({ row: 6, col: 4 }); // 3
  cells.push({ row: 6, col: 5 }); // 4
  cells.push({ row: 5, col: 6 }); // 5
  cells.push({ row: 4, col: 6 }); // 6
  cells.push({ row: 3, col: 6 }); // 7
  cells.push({ row: 2, col: 6 }); // 8 - safe
  cells.push({ row: 1, col: 6 }); // 9
  cells.push({ row: 0, col: 6 }); // 10
  cells.push({ row: 0, col: 7 }); // 11
  cells.push({ row: 0, col: 8 }); // 12

  // Green quadrant
  cells.push({ row: 1, col: 8, color: 'green' }); // 13 - green start, safe
  cells.push({ row: 2, col: 8 }); // 14
  cells.push({ row: 3, col: 8 }); // 15
  cells.push({ row: 4, col: 8 }); // 16
  cells.push({ row: 5, col: 8 }); // 17
  cells.push({ row: 6, col: 9 }); // 18
  cells.push({ row: 6, col: 10 }); // 19
  cells.push({ row: 6, col: 11 }); // 20
  cells.push({ row: 6, col: 12, }); // 21 - safe
  cells.push({ row: 6, col: 13 }); // 22
  cells.push({ row: 6, col: 14 }); // 23
  cells.push({ row: 7, col: 14 }); // 24
  cells.push({ row: 8, col: 14 }); // 25

  // Yellow quadrant
  cells.push({ row: 8, col: 13, color: 'yellow' }); // 26 - yellow start, safe
  cells.push({ row: 8, col: 12 }); // 27
  cells.push({ row: 8, col: 11 }); // 28
  cells.push({ row: 8, col: 10 }); // 29
  cells.push({ row: 8, col: 9 }); // 30
  cells.push({ row: 9, col: 8 }); // 31
  cells.push({ row: 10, col: 8 }); // 32
  cells.push({ row: 11, col: 8 }); // 33
  cells.push({ row: 12, col: 8 }); // 34 - safe
  cells.push({ row: 13, col: 8 }); // 35
  cells.push({ row: 14, col: 8 }); // 36
  cells.push({ row: 14, col: 7 }); // 37
  cells.push({ row: 14, col: 6 }); // 38

  // Blue quadrant
  cells.push({ row: 13, col: 6, color: 'blue' }); // 39 - blue start, safe
  cells.push({ row: 12, col: 6 }); // 40
  cells.push({ row: 11, col: 6 }); // 41
  cells.push({ row: 10, col: 6 }); // 42
  cells.push({ row: 9, col: 6 }); // 43
  cells.push({ row: 8, col: 5 }); // 44
  cells.push({ row: 8, col: 4 }); // 45
  cells.push({ row: 8, col: 3 }); // 46
  cells.push({ row: 8, col: 2 }); // 47 - safe
  cells.push({ row: 8, col: 1 }); // 48
  cells.push({ row: 8, col: 0 }); // 49
  cells.push({ row: 7, col: 0 }); // 50
  cells.push({ row: 6, col: 0 }); // 51

  return cells;
}

const FINISH_LANES: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

const HOME_POSITIONS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 2, col: 2 },
    { row: 2, col: 4 },
    { row: 4, col: 2 },
    { row: 4, col: 4 },
  ],
  green: [
    { row: 2, col: 10 },
    { row: 2, col: 12 },
    { row: 4, col: 10 },
    { row: 4, col: 12 },
  ],
  yellow: [
    { row: 10, col: 10 },
    { row: 10, col: 12 },
    { row: 12, col: 10 },
    { row: 12, col: 12 },
  ],
  blue: [
    { row: 10, col: 2 },
    { row: 10, col: 4 },
    { row: 12, col: 2 },
    { row: 12, col: 4 },
  ],
};

export function getTrackCellPixel(cellIndex: number): BoardCell {
  const def = TRACK_CELLS[cellIndex]!;
  return cellToPixel(def.row, def.col);
}

export function getFinishCellPixel(
  color: PlayerColor,
  cellIndex: number
): BoardCell {
  const lane = FINISH_LANES[color];
  const def = lane[cellIndex]!;
  return cellToPixel(def.row, def.col);
}

export function getHomeCellPixel(
  color: PlayerColor,
  pieceIndex: number
): BoardCell {
  const positions = HOME_POSITIONS[color];
  const def = positions[pieceIndex]!;
  return cellToPixel(def.row, def.col);
}

export function getCenterPixel(): BoardCell {
  return cellToPixel(7, 7);
}

export function drawBoard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  drawHomeAreas(ctx);
  drawTrackCells(ctx);
  drawFinishLanes(ctx);
  drawCenterTriangle(ctx);
  drawGrid(ctx);
}

function drawHomeAreas(ctx: CanvasRenderingContext2D): void {
  const areas: { color: PlayerColor; startRow: number; startCol: number }[] = [
    { color: 'red', startRow: 0, startCol: 0 },
    { color: 'green', startRow: 0, startCol: 9 },
    { color: 'yellow', startRow: 9, startCol: 9 },
    { color: 'blue', startRow: 9, startCol: 0 },
  ];

  for (const area of areas) {
    ctx.fillStyle = COLOR_HEX_LIGHT[area.color];
    ctx.fillRect(
      area.startCol * CELL_SIZE,
      area.startRow * CELL_SIZE,
      6 * CELL_SIZE,
      6 * CELL_SIZE
    );

    ctx.strokeStyle = COLOR_HEX[area.color];
    ctx.lineWidth = 2;
    ctx.strokeRect(
      area.startCol * CELL_SIZE + 1,
      area.startRow * CELL_SIZE + 1,
      6 * CELL_SIZE - 2,
      6 * CELL_SIZE - 2
    );

    ctx.fillStyle = '#FFFFFF';
    const inset = 1;
    ctx.fillRect(
      (area.startCol + inset) * CELL_SIZE + 4,
      (area.startRow + inset) * CELL_SIZE + 4,
      4 * CELL_SIZE - 8,
      4 * CELL_SIZE - 8
    );
    ctx.strokeRect(
      (area.startCol + inset) * CELL_SIZE + 4,
      (area.startRow + inset) * CELL_SIZE + 4,
      4 * CELL_SIZE - 8,
      4 * CELL_SIZE - 8
    );

    const homePos = HOME_POSITIONS[area.color];
    for (const pos of homePos) {
      const px = cellToPixel(pos.row, pos.col);
      ctx.beginPath();
      ctx.arc(px.x, px.y, CELL_SIZE / 2 - 6, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_HEX_LIGHT[area.color];
      ctx.fill();
      ctx.strokeStyle = COLOR_HEX[area.color];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawTrackCells(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < TRACK_CELLS.length; i++) {
    const cell = TRACK_CELLS[i]!;
    const px = cellToPixel(cell.row, cell.col);
    const x = px.x - CELL_SIZE / 2;
    const y = px.y - CELL_SIZE / 2;

    if (cell.color) {
      ctx.fillStyle = COLOR_HEX[cell.color];
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    if (
      [0, 8, 13, 21, 26, 34, 39, 47].includes(i) &&
      !cell.color
    ) {
      ctx.beginPath();
      ctx.arc(px.x, px.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#9E9E9E';
      ctx.fill();
    }
  }
}

function drawFinishLanes(ctx: CanvasRenderingContext2D): void {
  const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  for (const color of colors) {
    const lane = FINISH_LANES[color];
    for (let i = 0; i < lane.length; i++) {
      const pos = lane[i]!;
      const px = cellToPixel(pos.row, pos.col);
      const x = px.x - CELL_SIZE / 2;
      const y = px.y - CELL_SIZE / 2;

      ctx.fillStyle = COLOR_HEX_LIGHT[color];
      ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.strokeStyle = COLOR_HEX[color];
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }
}

function drawCenterTriangle(ctx: CanvasRenderingContext2D): void {
  const cx = 7 * CELL_SIZE + CELL_SIZE / 2;
  const cy = 7 * CELL_SIZE + CELL_SIZE / 2;
  const size = CELL_SIZE * 1.5;

  const triangles: { color: PlayerColor; angle: number }[] = [
    { color: 'red', angle: Math.PI },
    { color: 'green', angle: -Math.PI / 2 },
    { color: 'yellow', angle: 0 },
    { color: 'blue', angle: Math.PI / 2 },
  ];

  for (const t of triangles) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t.angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, -size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fillStyle = COLOR_HEX[t.color];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 0.5;
  for (let i = 6; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, BOARD_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(BOARD_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }
}
