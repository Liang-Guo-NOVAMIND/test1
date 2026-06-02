'use strict';

// Sokoban Game Engine
// Tile types: 0=floor, 1=wall, 2=target, 3=box, 4=player, 5=box-on-target, 6=player-on-target

const TILE = {
    FLOOR: 0,
    WALL: 1,
    TARGET: 2,
    BOX: 3,
    PLAYER: 4,
    BOX_ON_TARGET: 5,
    PLAYER_ON_TARGET: 6,
};

const DIRECTION = {
    UP: { dr: -1, dc: 0 },
    DOWN: { dr: 1, dc: 0 },
    LEFT: { dr: 0, dc: -1 },
    RIGHT: { dr: 0, dc: 1 },
};

const LEVELS = [
    {
        name: "Level 1",
        map: [
            "  ###  ",
            "  #.#  ",
            "  # ###",
            "###$ $.#",
            "#. $@###",
            "####   ",
        ],
    },
    {
        name: "Level 2",
        map: [
            "######  ",
            "#    # #",
            "# ##$# #",
            "# # .  #",
            "#  $.# #",
            "## #.  #",
            " #@  ###",
            " #####  ",
        ],
    },
    {
        name: "Level 3",
        map: [
            "  #####",
            "###   #",
            "#.@$  #",
            "### $.#",
            "#.##$ #",
            "# # . ##",
            "#$ $$$. #",
            "#   .  #",
            "########",
        ],
    },
    {
        name: "Level 4",
        map: [
            "########",
            "#      #",
            "# .**$ #",
            "# .  $ #",
            "# .$$$ #",
            "# .  @##",
            "########",
        ],
    },
    {
        name: "Level 5",
        map: [
            "  ######",
            "  #    #",
            "  # ##.#",
            "### ## #",
            "#  $   #",
            "# $ #..#",
            "#  $####",
            "###$   #",
            "  # @  #",
            "  ######",
        ],
    },
];

function charToTile(ch) {
    switch (ch) {
        case ' ': return TILE.FLOOR;
        case '#': return TILE.WALL;
        case '.': return TILE.TARGET;
        case '$': return TILE.BOX;
        case '@': return TILE.PLAYER;
        case '*': return TILE.BOX_ON_TARGET;
        case '+': return TILE.PLAYER_ON_TARGET;
        default: return TILE.FLOOR;
    }
}

function parseLevel(levelData) {
    const rows = levelData.map.length;
    const cols = Math.max(...levelData.map.map(r => r.length));
    const grid = [];
    let playerRow = -1;
    let playerCol = -1;

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const ch = c < levelData.map[r].length ? levelData.map[r][c] : ' ';
            const tile = charToTile(ch);
            if (tile === TILE.PLAYER || tile === TILE.PLAYER_ON_TARGET) {
                playerRow = r;
                playerCol = c;
            }
            row.push(tile);
        }
        grid.push(row);
    }

    return { grid, rows, cols, playerRow, playerCol, name: levelData.name };
}

function cloneGrid(grid) {
    return grid.map(row => [...row]);
}

function createGameState(levelIndex) {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) {
        levelIndex = 0;
    }
    const level = parseLevel(LEVELS[levelIndex]);
    return {
        grid: level.grid,
        rows: level.rows,
        cols: level.cols,
        playerRow: level.playerRow,
        playerCol: level.playerCol,
        steps: 0,
        levelIndex: levelIndex,
        levelName: level.name,
        completed: false,
    };
}

function isTarget(tile) {
    return tile === TILE.TARGET || tile === TILE.BOX_ON_TARGET || tile === TILE.PLAYER_ON_TARGET;
}

function removeEntity(tile) {
    if (tile === TILE.PLAYER) return TILE.FLOOR;
    if (tile === TILE.PLAYER_ON_TARGET) return TILE.TARGET;
    if (tile === TILE.BOX) return TILE.FLOOR;
    if (tile === TILE.BOX_ON_TARGET) return TILE.TARGET;
    return tile;
}

function placePlayer(tile) {
    if (tile === TILE.FLOOR) return TILE.PLAYER;
    if (tile === TILE.TARGET) return TILE.PLAYER_ON_TARGET;
    return tile;
}

function placeBox(tile) {
    if (tile === TILE.FLOOR) return TILE.BOX;
    if (tile === TILE.TARGET) return TILE.BOX_ON_TARGET;
    return tile;
}

function isWalkable(tile) {
    return tile === TILE.FLOOR || tile === TILE.TARGET;
}

function isPushable(tile) {
    return tile === TILE.BOX || tile === TILE.BOX_ON_TARGET;
}

function move(state, direction) {
    if (state.completed) return { moved: false, pushed: false };

    const { dr, dc } = direction;
    const newR = state.playerRow + dr;
    const newC = state.playerCol + dc;

    if (newR < 0 || newR >= state.rows || newC < 0 || newC >= state.cols) {
        return { moved: false, pushed: false };
    }

    const targetTile = state.grid[newR][newC];

    if (targetTile === TILE.WALL) {
        return { moved: false, pushed: false };
    }

    if (isPushable(targetTile)) {
        const beyondR = newR + dr;
        const beyondC = newC + dc;

        if (beyondR < 0 || beyondR >= state.rows || beyondC < 0 || beyondC >= state.cols) {
            return { moved: false, pushed: false };
        }

        const beyondTile = state.grid[beyondR][beyondC];
        if (!isWalkable(beyondTile)) {
            return { moved: false, pushed: false };
        }

        state.grid[beyondR][beyondC] = placeBox(beyondTile);
        state.grid[newR][newC] = removeEntity(targetTile);
        state.grid[newR][newC] = placePlayer(state.grid[newR][newC]);
        state.grid[state.playerRow][state.playerCol] = removeEntity(state.grid[state.playerRow][state.playerCol]);
        state.playerRow = newR;
        state.playerCol = newC;
        state.steps++;
        state.completed = checkWin(state);
        return { moved: true, pushed: true };
    }

    if (isWalkable(targetTile)) {
        state.grid[newR][newC] = placePlayer(targetTile);
        state.grid[state.playerRow][state.playerCol] = removeEntity(state.grid[state.playerRow][state.playerCol]);
        state.playerRow = newR;
        state.playerCol = newC;
        state.steps++;
        state.completed = checkWin(state);
        return { moved: true, pushed: false };
    }

    return { moved: false, pushed: false };
}

function checkWin(state) {
    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            if (state.grid[r][c] === TILE.TARGET || state.grid[r][c] === TILE.PLAYER_ON_TARGET) {
                return false;
            }
        }
    }
    return true;
}

function getTotalLevels() {
    return LEVELS.length;
}

export { TILE, DIRECTION, LEVELS, createGameState, move, checkWin, getTotalLevels, cloneGrid };
