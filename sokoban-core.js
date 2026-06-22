'use strict';

// ============================================================
// Sokoban Core - Level data structures, definitions, and solver
// ============================================================
//
// LEVEL FORMAT
// ------------
// Each level is an object with:
//   name        - display name for the level
//   difficulty  - 'tutorial' | 'easy' | 'intermediate'
//   width       - grid width in tiles
//   height      - grid height in tiles
//   grid        - 2D array of tile values (row-major, grid[y][x])
//   description - hint or note about the puzzle
//
// TILE VALUES
// -----------
//   0  FLOOR   - empty walkable space
//   1  WALL    - impassable wall
//   2  BOX     - pushable box (on floor)
//   3  TARGET  - goal position for a box
//   4  PLAYER  - player start position (on floor)
//   5  BOX_ON_TARGET  - box already on a target
//   6  PLAYER_ON_TARGET - player standing on a target
//
// RULES
// -----
// - Exactly one PLAYER (4) or PLAYER_ON_TARGET (6) per level.
// - Count of boxes (2 + 5) must equal count of targets (3 + 5 + 6).
// - Player can push one box at a time (cannot pull, cannot push two).
// - Level is solved when every target has a box on it.
//
// COORDINATE SYSTEM
// -----------------
//   grid[y][x] where y=0 is the top row, x=0 is the left column.
//   Directions: UP=(0,-1), DOWN=(0,1), LEFT=(-1,0), RIGHT=(1,0)
// ============================================================

const TILE = Object.freeze({
    FLOOR: 0,
    WALL: 1,
    BOX: 2,
    TARGET: 3,
    PLAYER: 4,
    BOX_ON_TARGET: 5,
    PLAYER_ON_TARGET: 6,
});

const TILE_CHARS = Object.freeze({
    [TILE.FLOOR]: ' ',
    [TILE.WALL]: '#',
    [TILE.BOX]: '$',
    [TILE.TARGET]: '.',
    [TILE.PLAYER]: '@',
    [TILE.BOX_ON_TARGET]: '*',
    [TILE.PLAYER_ON_TARGET]: '+',
});

const CHAR_TO_TILE = Object.freeze({
    ' ': TILE.FLOOR,
    '#': TILE.WALL,
    '$': TILE.BOX,
    '.': TILE.TARGET,
    '@': TILE.PLAYER,
    '*': TILE.BOX_ON_TARGET,
    '+': TILE.PLAYER_ON_TARGET,
});

// Directions: [dx, dy]
const DIRECTIONS = [
    [0, -1],  // UP
    [0, 1],   // DOWN
    [-1, 0],  // LEFT
    [1, 0],   // RIGHT
];

// ============================================================
// Helper: parse a text-art level into a grid
// ============================================================
function parseLevel(lines) {
    const height = lines.length;
    const width = Math.max(...lines.map(l => l.length));
    const grid = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const ch = x < lines[y].length ? lines[y][x] : ' ';
            row.push(CHAR_TO_TILE[ch] !== undefined ? CHAR_TO_TILE[ch] : TILE.FLOOR);
        }
        grid.push(row);
    }
    return { width, height, grid };
}

// ============================================================
// Level validation
// ============================================================
function validateLevel(level) {
    const errors = [];
    const { width, height, grid } = level;

    let playerCount = 0;
    let boxCount = 0;
    let targetCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = grid[y][x];
            if (tile === TILE.PLAYER || tile === TILE.PLAYER_ON_TARGET) playerCount++;
            if (tile === TILE.BOX || tile === TILE.BOX_ON_TARGET) boxCount++;
            if (tile === TILE.TARGET || tile === TILE.BOX_ON_TARGET || tile === TILE.PLAYER_ON_TARGET) targetCount++;
        }
    }

    if (playerCount !== 1) {
        errors.push(`Expected exactly 1 player, found ${playerCount}`);
    }
    if (boxCount === 0) {
        errors.push('No boxes found');
    }
    if (boxCount !== targetCount) {
        errors.push(`Box count (${boxCount}) != target count (${targetCount})`);
    }

    return { valid: errors.length === 0, errors, stats: { playerCount, boxCount, targetCount } };
}

// ============================================================
// BFS Solver - verifies a level is solvable
// State: player position + sorted box positions, encoded as string
// ============================================================
function solveLevel(level) {
    const { width, height, grid } = level;

    let playerX = -1, playerY = -1;
    const boxes = [];
    const targets = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = grid[y][x];
            if (tile === TILE.PLAYER || tile === TILE.PLAYER_ON_TARGET) {
                playerX = x;
                playerY = y;
            }
            if (tile === TILE.BOX || tile === TILE.BOX_ON_TARGET) {
                boxes.push([x, y]);
            }
            if (tile === TILE.TARGET || tile === TILE.BOX_ON_TARGET || tile === TILE.PLAYER_ON_TARGET) {
                targets.add(y * width + x);
            }
        }
    }

    function isWall(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return true;
        return grid[y][x] === TILE.WALL;
    }

    function encodeState(px, py, bxs) {
        const sorted = bxs.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        return `${px},${py}|${sorted.map(b => `${b[0]},${b[1]}`).join(';')}`;
    }

    function isSolved(bxs) {
        return bxs.every(([bx, by]) => targets.has(by * width + bx));
    }

    // Simple deadlock detection: box in a corner formed by walls
    function isSimpleDeadlock(bx, by, bxs) {
        if (targets.has(by * width + bx)) return false;

        const wallUp = isWall(bx, by - 1);
        const wallDown = isWall(bx, by + 1);
        const wallLeft = isWall(bx - 1, by);
        const wallRight = isWall(bx + 1, by);

        if ((wallUp || wallDown) && (wallLeft || wallRight)) return true;
        return false;
    }

    const initialState = encodeState(playerX, playerY, boxes);
    const visited = new Set([initialState]);
    const queue = [{ px: playerX, py: playerY, boxes: boxes.map(b => [...b]), moves: '' }];

    const MAX_STATES = 500000;
    let statesExplored = 0;

    while (queue.length > 0 && statesExplored < MAX_STATES) {
        const { px, py, boxes: curBoxes, moves } = queue.shift();
        statesExplored++;

        for (let d = 0; d < DIRECTIONS.length; d++) {
            const [dx, dy] = DIRECTIONS[d];
            const nx = px + dx;
            const ny = py + dy;

            if (isWall(nx, ny)) continue;

            const boxIdx = curBoxes.findIndex(([bx, by]) => bx === nx && by === ny);
            let newBoxes = curBoxes;

            if (boxIdx !== -1) {
                const bx2 = nx + dx;
                const by2 = ny + dy;
                if (isWall(bx2, by2)) continue;
                if (curBoxes.some(([bx, by]) => bx === bx2 && by === by2)) continue;

                newBoxes = curBoxes.map((b, i) => i === boxIdx ? [bx2, by2] : [...b]);

                if (isSimpleDeadlock(bx2, by2, newBoxes)) continue;
            }

            const stateKey = encodeState(nx, ny, newBoxes);
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);

            if (isSolved(newBoxes)) {
                const dirChars = ['u', 'd', 'l', 'r'];
                return {
                    solvable: true,
                    solution: moves + dirChars[d],
                    statesExplored,
                    solutionLength: moves.length + 1,
                };
            }

            queue.push({ px: nx, py: ny, boxes: newBoxes, moves: moves + ['u', 'd', 'l', 'r'][d] });
        }
    }

    return {
        solvable: false,
        solution: null,
        statesExplored,
        solutionLength: 0,
    };
}

// ============================================================
// LEVELS - 8 levels with progressive difficulty
//
// Difficulty progression:
//   Levels 1-2: Tutorial (1-2 boxes, simple straight pushes)
//   Levels 3-4: Easy (2-3 boxes, basic sequencing)
//   Levels 5-6: Intermediate (3-4 boxes, tighter spaces)
//   Levels 7-8: Advanced intermediate (4-5 boxes, requires planning)
// ============================================================

// --- Level 1: First Push (Tutorial) ---
// One box, one target. Push right to solve.
const level1 = parseLevel([
    '#####',
    '#   #',
    '#@$.#',
    '#   #',
    '#####',
]);

// --- Level 2: Two Boxes (Tutorial) ---
// Two boxes, two targets. Introduces multi-box thinking.
const level2 = parseLevel([
    '######',
    '#@   #',
    '# $$ #',
    '# .. #',
    '######',
]);

// --- Level 3: L-Shaped Path (Easy) ---
// Two boxes, requires pushing around a corner.
const level3 = parseLevel([
    '#######',
    '#.  # #',
    '#.$ $ #',
    '#  #  #',
    '#  @  #',
    '#######',
]);

// --- Level 4: Side by Side (Easy) ---
// Three boxes, push each one down to the target row.
const level4 = parseLevel([
    '########',
    '#  @   #',
    '#      #',
    '# $$$  #',
    '# ...  #',
    '#      #',
    '########',
]);

// --- Level 5: Cramped Quarters (Intermediate) ---
// Three boxes in a smaller space with less room to maneuver.
const level5 = parseLevel([
    '  ####',
    '###  #',
    '#. $ #',
    '#.$$ #',
    '#.@  #',
    '######',
]);

// --- Level 6: The Warehouse (Intermediate) ---
// Four boxes with a central corridor. Requires sequencing.
const level6 = parseLevel([
    '  #####',
    '###   #',
    '# $ # #',
    '# $$  #',
    '#..$ @#',
    '#..  ##',
    '######',
]);

// --- Level 7: Storage Room (Advanced Intermediate) ---
// Four boxes in an open room with wall features.
const level7 = parseLevel([
    '  ######',
    '###    #',
    '#  $#$ #',
    '# #..  #',
    '#  ..# #',
    '# $#$  #',
    '#   @  #',
    '########',
]);

// --- Level 8: The Gauntlet (Advanced Intermediate) ---
// Five boxes above a target row. Must sequence pushes carefully.
const level8 = parseLevel([
    '########',
    '#      #',
    '#  @   #',
    '#$$$$$ #',
    '#..... #',
    '#      #',
    '########',
]);

const LEVELS = [
    {
        ...level1,
        name: 'First Push',
        difficulty: 'tutorial',
        description: 'Push the box onto the target. Simple as that!',
    },
    {
        ...level2,
        name: 'Double Trouble',
        difficulty: 'tutorial',
        description: 'Two boxes, two targets. Push them down to the goals.',
    },
    {
        ...level3,
        name: 'L-Shaped Path',
        difficulty: 'easy',
        description: 'Navigate boxes around corners. Watch your angles.',
    },
    {
        ...level4,
        name: 'Side by Side',
        difficulty: 'easy',
        description: 'Three targets in a row. Think about the order.',
    },
    {
        ...level5,
        name: 'Cramped Quarters',
        difficulty: 'intermediate',
        description: 'Tight space, no room for mistakes.',
    },
    {
        ...level6,
        name: 'The Warehouse',
        difficulty: 'intermediate',
        description: 'Four boxes, careful sequencing required.',
    },
    {
        ...level7,
        name: 'Storage Room',
        difficulty: 'intermediate',
        description: 'Symmetry is deceptive. Plan your route.',
    },
    {
        ...level8,
        name: 'The Gauntlet',
        difficulty: 'intermediate',
        description: 'Five boxes, multiple paths. Full planning required.',
    },
];

// ============================================================
// Exports (for use in browser or module system)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TILE, TILE_CHARS, CHAR_TO_TILE, DIRECTIONS, LEVELS, parseLevel, validateLevel, solveLevel };
}
