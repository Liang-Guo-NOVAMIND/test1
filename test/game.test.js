const assert = require("assert");
const { TILE, levels } = require("../src/levels");
const {
  createGameState,
  move,
  undo,
  checkWinCondition,
  getRenderedMap,
  getLevelCount,
  parseLevel,
} = require("../src/game");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${e.message}`);
  }
}

function suite(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// --- Level Data Tests ---

suite("Level Data Structure", () => {
  test("TILE enum has all required markers", () => {
    assert.strictEqual(TILE.EMPTY, 0);
    assert.strictEqual(TILE.WALL, 1);
    assert.strictEqual(TILE.FLOOR, 2);
    assert.strictEqual(TILE.TARGET, 3);
    assert.strictEqual(TILE.BOX, 4);
    assert.strictEqual(TILE.PLAYER, 5);
    assert.strictEqual(TILE.BOX_ON_TARGET, 6);
    assert.strictEqual(TILE.PLAYER_ON_TARGET, 7);
  });

  test("levels array has between 5 and 10 levels", () => {
    assert.ok(levels.length >= 5, `Expected >= 5 levels, got ${levels.length}`);
    assert.ok(
      levels.length <= 10,
      `Expected <= 10 levels, got ${levels.length}`
    );
  });

  test("each level has a name and 2D map array", () => {
    for (let i = 0; i < levels.length; i++) {
      assert.ok(levels[i].name, `Level ${i} missing name`);
      assert.ok(Array.isArray(levels[i].map), `Level ${i} map is not array`);
      assert.ok(levels[i].map.length > 0, `Level ${i} map is empty`);
      for (const row of levels[i].map) {
        assert.ok(Array.isArray(row), `Level ${i} has non-array row`);
      }
    }
  });

  test("each level has exactly one player", () => {
    for (let i = 0; i < levels.length; i++) {
      let playerCount = 0;
      for (const row of levels[i].map) {
        for (const cell of row) {
          if (cell === TILE.PLAYER || cell === TILE.PLAYER_ON_TARGET) {
            playerCount++;
          }
        }
      }
      assert.strictEqual(playerCount, 1, `Level ${i} has ${playerCount} players`);
    }
  });

  test("each level has equal number of boxes and targets", () => {
    for (let i = 0; i < levels.length; i++) {
      let boxCount = 0;
      let targetCount = 0;
      for (const row of levels[i].map) {
        for (const cell of row) {
          if (cell === TILE.BOX || cell === TILE.BOX_ON_TARGET) boxCount++;
          if (
            cell === TILE.TARGET ||
            cell === TILE.BOX_ON_TARGET ||
            cell === TILE.PLAYER_ON_TARGET
          )
            targetCount++;
        }
      }
      assert.strictEqual(
        boxCount,
        targetCount,
        `Level ${i}: ${boxCount} boxes != ${targetCount} targets`
      );
    }
  });

  test("level maps use only valid tile values", () => {
    const validTiles = new Set(Object.values(TILE));
    for (let i = 0; i < levels.length; i++) {
      for (const row of levels[i].map) {
        for (const cell of row) {
          assert.ok(
            validTiles.has(cell),
            `Level ${i} has invalid tile value: ${cell}`
          );
        }
      }
    }
  });
});

// --- parseLevel Tests ---

suite("parseLevel", () => {
  test("extracts player position from map", () => {
    const { player } = parseLevel(levels[0]);
    assert.ok(player !== null, "Player should not be null");
    assert.strictEqual(typeof player.row, "number");
    assert.strictEqual(typeof player.col, "number");
  });

  test("extracts boxes from map", () => {
    const { boxes } = parseLevel(levels[0]);
    assert.ok(Array.isArray(boxes));
    assert.ok(boxes.length > 0, "Should have at least one box");
  });

  test("extracts targets from map", () => {
    const { targets } = parseLevel(levels[0]);
    assert.ok(Array.isArray(targets));
    assert.ok(targets.length > 0, "Should have at least one target");
  });

  test("base map has no player or box tiles after parsing", () => {
    const { map } = parseLevel(levels[0]);
    for (const row of map) {
      for (const cell of row) {
        assert.ok(
          cell !== TILE.PLAYER &&
            cell !== TILE.BOX &&
            cell !== TILE.BOX_ON_TARGET &&
            cell !== TILE.PLAYER_ON_TARGET,
          "Base map should not contain entity tiles"
        );
      }
    }
  });

  test("boxes and targets count match after parsing", () => {
    for (let i = 0; i < levels.length; i++) {
      const { boxes, targets } = parseLevel(levels[i]);
      assert.strictEqual(
        boxes.length,
        targets.length,
        `Level ${i}: parsed ${boxes.length} boxes != ${targets.length} targets`
      );
    }
  });
});

// --- createGameState Tests ---

suite("createGameState", () => {
  test("creates valid initial state for level 0", () => {
    const state = createGameState(0);
    assert.strictEqual(state.levelIndex, 0);
    assert.ok(state.levelName);
    assert.ok(state.player);
    assert.ok(Array.isArray(state.boxes));
    assert.ok(Array.isArray(state.targets));
    assert.ok(Array.isArray(state.moveHistory));
    assert.strictEqual(state.moveHistory.length, 0);
    assert.strictEqual(state.moveCount, 0);
    assert.strictEqual(state.pushCount, 0);
    assert.strictEqual(state.won, false);
  });

  test("throws for invalid level index", () => {
    assert.throws(() => createGameState(-1));
    assert.throws(() => createGameState(100));
  });

  test("getLevelCount returns correct count", () => {
    assert.strictEqual(getLevelCount(), levels.length);
  });
});

// --- Move Validation Tests ---

suite("Move Validation", () => {
  test("player cannot move into a wall", () => {
    const state = createGameState(0);
    // Level 0: player at row 3, col 1 — wall is at row 4, col 1
    const result = move(state, "DOWN");
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.pushed, false);
  });

  test("player can move onto floor tile", () => {
    const state = createGameState(0);
    // Level 0: player at row 3, col 1 — floor at row 3, col 2
    const result = move(state, "RIGHT");
    assert.strictEqual(result.moved, true);
    assert.strictEqual(result.pushed, false);
    assert.strictEqual(state.player.row, 3);
    assert.strictEqual(state.player.col, 2);
  });

  test("player can move onto target tile", () => {
    const state = createGameState(0);
    // Move up from (3,1) to (2,1) then up to (1,1) then right towards target at (1,3)
    move(state, "UP");
    move(state, "UP");
    move(state, "RIGHT");
    const result = move(state, "RIGHT");
    assert.strictEqual(result.moved, true);
    assert.strictEqual(state.player.row, 1);
    assert.strictEqual(state.player.col, 3);
  });

  test("invalid direction throws error", () => {
    const state = createGameState(0);
    assert.throws(() => move(state, "DIAGONAL"));
  });

  test("move count increments on successful move", () => {
    const state = createGameState(0);
    assert.strictEqual(state.moveCount, 0);
    move(state, "RIGHT");
    assert.strictEqual(state.moveCount, 1);
    move(state, "UP");
    assert.strictEqual(state.moveCount, 2);
  });

  test("move count does not increment on failed move", () => {
    const state = createGameState(0);
    move(state, "DOWN"); // into wall
    assert.strictEqual(state.moveCount, 0);
  });
});

// --- Push Mechanics Tests ---

suite("Push Mechanics", () => {
  test("player pushes box when moving into it", () => {
    const state = createGameState(0);
    // Level 0: player at (3,1), box at (2,2)
    // Move player right to (3,2), then up to push box at (2,2)
    move(state, "RIGHT");
    const result = move(state, "UP");
    assert.strictEqual(result.moved, true);
    assert.strictEqual(result.pushed, true);
    assert.strictEqual(state.player.row, 2);
    assert.strictEqual(state.player.col, 2);
    assert.strictEqual(state.boxes[0].row, 1);
    assert.strictEqual(state.boxes[0].col, 2);
  });

  test("push count increments when box is pushed", () => {
    const state = createGameState(0);
    move(state, "RIGHT"); // move to (3,2)
    move(state, "UP");    // push box at (2,2) up to (1,2)
    assert.strictEqual(state.pushCount, 1);
  });

  test("cannot push box into wall", () => {
    const state = createGameState(0);
    // Push box up: player(3,2) -> box(2,2) -> (1,2)
    move(state, "RIGHT");
    move(state, "UP");
    // Box now at (1,2). Push again: player(2,2) -> box(1,2) -> wall(0,2)
    const result = move(state, "UP");
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.pushed, false);
  });

  test("cannot push box into another box", () => {
    // Custom state: two boxes in a line vertically
    const state = createGameState(0);
    state.player = { row: 3, col: 1 };
    state.boxes = [
      { row: 2, col: 1 },
      { row: 1, col: 1 },
    ];
    state.targets = [{ row: 1, col: 3 }];
    const result = move(state, "UP");
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.pushed, false);
  });

  test("box moves to correct position after push", () => {
    const state = createGameState(0);
    // Box at (2,2), push up from (3,2)
    move(state, "RIGHT"); // player to (3,2)
    move(state, "UP");    // push box (2,2) to (1,2)
    const boxIdx = 0;
    assert.strictEqual(state.boxes[boxIdx].row, 1);
    assert.strictEqual(state.boxes[boxIdx].col, 2);
  });
});

// --- Win Condition Tests ---

suite("Win Condition", () => {
  test("checkWinCondition returns false when boxes not on targets", () => {
    const state = createGameState(0);
    assert.strictEqual(
      checkWinCondition(state.boxes, state.targets),
      false
    );
  });

  test("checkWinCondition returns true when all boxes on targets", () => {
    const boxes = [
      { row: 1, col: 3 },
      { row: 2, col: 3 },
    ];
    const targets = [
      { row: 1, col: 3 },
      { row: 2, col: 3 },
    ];
    assert.strictEqual(checkWinCondition(boxes, targets), true);
  });

  test("checkWinCondition returns false when only some boxes on targets", () => {
    const boxes = [
      { row: 1, col: 3 },
      { row: 2, col: 2 },
    ];
    const targets = [
      { row: 1, col: 3 },
      { row: 2, col: 3 },
    ];
    assert.strictEqual(checkWinCondition(boxes, targets), false);
  });

  test("game state won flag is set when level is solved", () => {
    // Create a minimal level where one push solves it
    const state = createGameState(0);
    // Level 0: target at (1,3), box at (2,1)
    // Manually position box next to target for a quick solve
    state.boxes = [{ row: 1, col: 2 }];
    state.targets = [{ row: 1, col: 3 }];
    // Player at (1,1), push box right from (1,2) to (1,3) = target
    state.player = { row: 1, col: 1 };
    const result = move(state, "RIGHT");
    assert.strictEqual(result.pushed, true);
    assert.strictEqual(state.won, true);
  });

  test("no moves allowed after winning", () => {
    const state = createGameState(0);
    state.boxes = [{ row: 1, col: 2 }];
    state.targets = [{ row: 1, col: 3 }];
    state.player = { row: 1, col: 1 };
    move(state, "RIGHT"); // solve
    assert.strictEqual(state.won, true);
    const result = move(state, "RIGHT");
    assert.strictEqual(result.moved, false);
  });
});

// --- Undo Tests ---

suite("Undo Functionality", () => {
  test("undo returns false when no history", () => {
    const state = createGameState(0);
    const result = undo(state);
    assert.strictEqual(result.undone, false);
  });

  test("undo restores player position after simple move", () => {
    const state = createGameState(0);
    const originalPos = { ...state.player };
    move(state, "RIGHT");
    assert.notDeepStrictEqual(state.player, originalPos);
    undo(state);
    assert.deepStrictEqual(state.player, originalPos);
  });

  test("undo decrements move count", () => {
    const state = createGameState(0);
    move(state, "RIGHT");
    assert.strictEqual(state.moveCount, 1);
    undo(state);
    assert.strictEqual(state.moveCount, 0);
  });

  test("undo restores box position after push", () => {
    const state = createGameState(0);
    const originalBoxPos = { ...state.boxes[0] };
    move(state, "RIGHT"); // move to (3,2)
    move(state, "UP");    // push box at (2,2) up
    assert.notDeepStrictEqual(state.boxes[0], originalBoxPos);
    undo(state);
    assert.deepStrictEqual(state.boxes[0], originalBoxPos);
  });

  test("undo decrements push count after push undo", () => {
    const state = createGameState(0);
    move(state, "RIGHT"); // move to (3,2)
    move(state, "UP");    // push box
    assert.strictEqual(state.pushCount, 1);
    undo(state);
    assert.strictEqual(state.pushCount, 0);
  });

  test("multiple undos restore original state", () => {
    const state = createGameState(0);
    const originalPlayer = { ...state.player };
    move(state, "RIGHT");
    move(state, "RIGHT");
    undo(state);
    undo(state);
    assert.deepStrictEqual(state.player, originalPlayer);
    assert.strictEqual(state.moveCount, 0);
  });

  test("undo clears won flag", () => {
    const state = createGameState(0);
    state.boxes = [{ row: 1, col: 2 }];
    state.targets = [{ row: 1, col: 3 }];
    state.player = { row: 1, col: 1 };
    move(state, "RIGHT"); // solve
    assert.strictEqual(state.won, true);
    undo(state);
    assert.strictEqual(state.won, false);
  });

  test("can continue playing after undo from won state", () => {
    const state = createGameState(0);
    state.boxes = [{ row: 1, col: 2 }];
    state.targets = [{ row: 1, col: 3 }];
    state.player = { row: 1, col: 1 };
    move(state, "RIGHT"); // solve
    undo(state);
    // Should be able to move again
    const result = move(state, "RIGHT");
    assert.strictEqual(result.moved, true);
  });
});

// --- getRenderedMap Tests ---

suite("getRenderedMap", () => {
  test("rendered map includes player on correct tile", () => {
    const state = createGameState(0);
    const rendered = getRenderedMap(state);
    assert.strictEqual(rendered[state.player.row][state.player.col], TILE.PLAYER);
  });

  test("rendered map includes boxes on correct tiles", () => {
    const state = createGameState(0);
    const rendered = getRenderedMap(state);
    for (const box of state.boxes) {
      const tile = rendered[box.row][box.col];
      assert.ok(
        tile === TILE.BOX || tile === TILE.BOX_ON_TARGET,
        `Expected BOX or BOX_ON_TARGET at (${box.row}, ${box.col}), got ${tile}`
      );
    }
  });

  test("box on target renders as BOX_ON_TARGET", () => {
    const state = createGameState(0);
    // Place a box on a target
    const target = state.targets[0];
    state.boxes[0] = { row: target.row, col: target.col };
    const rendered = getRenderedMap(state);
    assert.strictEqual(rendered[target.row][target.col], TILE.BOX_ON_TARGET);
  });

  test("player on target renders as PLAYER_ON_TARGET", () => {
    const state = createGameState(0);
    // Move player to target position
    const target = state.targets[0];
    state.player = { row: target.row, col: target.col };
    const rendered = getRenderedMap(state);
    assert.strictEqual(
      rendered[target.row][target.col],
      TILE.PLAYER_ON_TARGET
    );
  });

  test("rendered map does not mutate game state", () => {
    const state = createGameState(0);
    const playerBefore = { ...state.player };
    const boxesBefore = state.boxes.map((b) => ({ ...b }));
    getRenderedMap(state);
    assert.deepStrictEqual(state.player, playerBefore);
    assert.deepStrictEqual(state.boxes, boxesBefore);
  });
});

// --- Integration: Cannot push box into another box ---

suite("Integration: Box-on-box collision", () => {
  test("cannot push box into another box", () => {
    // Custom state: two boxes in a line
    const state = createGameState(0);
    state.player = { row: 3, col: 1 };
    state.boxes = [
      { row: 2, col: 1 },
      { row: 1, col: 1 },
    ];
    state.targets = [{ row: 1, col: 3 }];
    // Push up: player(3,1) -> box(2,1) -> box(1,1) blocks
    const result = move(state, "UP");
    assert.strictEqual(result.moved, false);
    assert.strictEqual(result.pushed, false);
  });
});

// --- Integration: Full solve of level 0 ---

suite("Integration: Solving Level 0", () => {
  test("level 0 can be solved with correct moves", () => {
    // Level 0 layout:
    // W W W W W
    // W . . T W     (target at 1,3)
    // W . B . W     (box at 2,2)
    // W P . . W     (player at 3,1)
    // W W W W W
    const state = createGameState(0);
    assert.strictEqual(state.boxes[0].row, 2);
    assert.strictEqual(state.boxes[0].col, 2);
    assert.strictEqual(state.player.row, 3);
    assert.strictEqual(state.player.col, 1);

    // Move up to (2,1)
    let r = move(state, "UP");
    assert.strictEqual(r.moved, true);
    // Push box right: player(2,1) -> box(2,2) -> (2,3)
    r = move(state, "RIGHT");
    assert.strictEqual(r.pushed, true);
    assert.strictEqual(state.boxes[0].col, 3);
    // Move down to (3,2)
    move(state, "DOWN");
    // Move right to (3,3)
    move(state, "RIGHT");
    // Push box up: player(3,3) -> box(2,3) -> (1,3) = target
    r = move(state, "UP");
    assert.strictEqual(r.pushed, true);
    assert.strictEqual(state.boxes[0].row, 1);
    assert.strictEqual(state.boxes[0].col, 3);
    assert.strictEqual(state.won, true);
  });
});

// --- Edge cases ---

suite("Edge Cases", () => {
  test("move history tracks all moves for full undo", () => {
    // Use the same solve sequence as the integration test
    const state = createGameState(0);
    const origPlayer = { ...state.player };
    const origBox = { ...state.boxes[0] };

    move(state, "UP");      // move to (2,1)
    move(state, "RIGHT");   // push box right (2,2) -> (2,3)
    move(state, "DOWN");    // move to (3,2)
    move(state, "RIGHT");   // move to (3,3)
    move(state, "UP");      // push box up (2,3) -> (1,3) — WIN

    assert.strictEqual(state.won, true);
    assert.strictEqual(state.moveHistory.length, 5);

    // Undo all
    undo(state);
    undo(state);
    undo(state);
    undo(state);
    undo(state);

    assert.deepStrictEqual(state.player, origPlayer);
    assert.deepStrictEqual(state.boxes[0], origBox);
    assert.strictEqual(state.moveCount, 0);
    assert.strictEqual(state.pushCount, 0);
    assert.strictEqual(state.won, false);
  });

  test("all levels can be initialized without errors", () => {
    for (let i = 0; i < getLevelCount(); i++) {
      const state = createGameState(i);
      assert.ok(state.player, `Level ${i} has no player`);
      assert.ok(state.boxes.length > 0, `Level ${i} has no boxes`);
      assert.ok(state.targets.length > 0, `Level ${i} has no targets`);
      assert.strictEqual(
        state.boxes.length,
        state.targets.length,
        `Level ${i} box/target mismatch`
      );
    }
  });

  test("player position is within map bounds for all levels", () => {
    for (let i = 0; i < getLevelCount(); i++) {
      const state = createGameState(i);
      assert.ok(state.player.row >= 0);
      assert.ok(state.player.row < state.map.length);
      assert.ok(state.player.col >= 0);
      assert.ok(state.player.col < state.map[0].length);
    }
  });
});

// --- Summary ---

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}`);

process.exit(failed > 0 ? 1 : 0);
