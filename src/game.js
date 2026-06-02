const { TILE, levels } = require("./levels");

const DIRECTION = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
};

function parseLevel(levelData) {
  const map = levelData.map.map((row) => [...row]);
  let player = null;
  const boxes = [];
  const targets = [];

  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const tile = map[r][c];
      switch (tile) {
        case TILE.PLAYER:
          player = { row: r, col: c };
          map[r][c] = TILE.FLOOR;
          break;
        case TILE.PLAYER_ON_TARGET:
          player = { row: r, col: c };
          map[r][c] = TILE.TARGET;
          targets.push({ row: r, col: c });
          break;
        case TILE.BOX:
          boxes.push({ row: r, col: c });
          map[r][c] = TILE.FLOOR;
          break;
        case TILE.BOX_ON_TARGET:
          boxes.push({ row: r, col: c });
          map[r][c] = TILE.TARGET;
          targets.push({ row: r, col: c });
          break;
        case TILE.TARGET:
          targets.push({ row: r, col: c });
          break;
      }
    }
  }

  return { map, player, boxes, targets };
}

function createGameState(levelIndex) {
  if (levelIndex < 0 || levelIndex >= levels.length) {
    throw new Error(
      `Invalid level index: ${levelIndex}. Must be 0-${levels.length - 1}.`
    );
  }

  const levelData = levels[levelIndex];
  const { map, player, boxes, targets } = parseLevel(levelData);

  return {
    levelIndex,
    levelName: levelData.name,
    map,
    player: { ...player },
    boxes: boxes.map((b) => ({ ...b })),
    targets: [...targets],
    moveHistory: [],
    moveCount: 0,
    pushCount: 0,
    won: false,
  };
}

function isWalkable(map, row, col) {
  if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) {
    return false;
  }
  const tile = map[row][col];
  return tile === TILE.FLOOR || tile === TILE.TARGET;
}

function findBoxAt(boxes, row, col) {
  return boxes.findIndex((b) => b.row === row && b.col === col);
}

function checkWinCondition(boxes, targets) {
  return targets.every((t) =>
    boxes.some((b) => b.row === t.row && b.col === t.col)
  );
}

function move(state, direction) {
  if (state.won) {
    return { moved: false, pushed: false, state };
  }

  const dir = DIRECTION[direction];
  if (!dir) {
    throw new Error(
      `Invalid direction: ${direction}. Use UP, DOWN, LEFT, or RIGHT.`
    );
  }

  const destRow = state.player.row + dir.row;
  const destCol = state.player.col + dir.col;

  if (!isWalkable(state.map, destRow, destCol)) {
    return { moved: false, pushed: false, state };
  }

  const boxIdx = findBoxAt(state.boxes, destRow, destCol);

  if (boxIdx !== -1) {
    const pushDestRow = destRow + dir.row;
    const pushDestCol = destCol + dir.col;

    if (!isWalkable(state.map, pushDestRow, pushDestCol)) {
      return { moved: false, pushed: false, state };
    }

    if (findBoxAt(state.boxes, pushDestRow, pushDestCol) !== -1) {
      return { moved: false, pushed: false, state };
    }

    state.moveHistory.push({
      playerFrom: { ...state.player },
      boxIndex: boxIdx,
      boxFrom: { ...state.boxes[boxIdx] },
    });

    state.boxes[boxIdx] = { row: pushDestRow, col: pushDestCol };
    state.player = { row: destRow, col: destCol };
    state.moveCount++;
    state.pushCount++;
    state.won = checkWinCondition(state.boxes, state.targets);

    return { moved: true, pushed: true, state };
  }

  state.moveHistory.push({
    playerFrom: { ...state.player },
    boxIndex: -1,
    boxFrom: null,
  });

  state.player = { row: destRow, col: destCol };
  state.moveCount++;

  return { moved: true, pushed: false, state };
}

function undo(state) {
  if (state.moveHistory.length === 0) {
    return { undone: false, state };
  }

  if (state.won) {
    state.won = false;
  }

  const entry = state.moveHistory.pop();
  state.player = { ...entry.playerFrom };
  state.moveCount--;

  if (entry.boxIndex !== -1) {
    state.boxes[entry.boxIndex] = { ...entry.boxFrom };
    state.pushCount--;
  }

  return { undone: true, state };
}

function getRenderedMap(state) {
  const rendered = state.map.map((row) => [...row]);

  for (const box of state.boxes) {
    const base = rendered[box.row][box.col];
    rendered[box.row][box.col] =
      base === TILE.TARGET ? TILE.BOX_ON_TARGET : TILE.BOX;
  }

  const pBase = rendered[state.player.row][state.player.col];
  rendered[state.player.row][state.player.col] =
    pBase === TILE.TARGET ? TILE.PLAYER_ON_TARGET : TILE.PLAYER;

  return rendered;
}

function getLevelCount() {
  return levels.length;
}

module.exports = {
  DIRECTION,
  createGameState,
  move,
  undo,
  checkWinCondition,
  getRenderedMap,
  getLevelCount,
  parseLevel,
};
