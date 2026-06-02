'use strict';

const { LEVELS, validateLevel, solveLevel } = require('./sokoban-core.js');

console.log('Sokoban Level Validation');
console.log('========================\n');

let allValid = true;

LEVELS.forEach((level, idx) => {
    const num = idx + 1;
    console.log(`Level ${num}: ${level.name} (${level.difficulty})`);
    console.log(`  Size: ${level.width}x${level.height}`);

    const validation = validateLevel(level);
    if (!validation.valid) {
        console.log(`  STRUCTURAL ERRORS: ${validation.errors.join(', ')}`);
        allValid = false;
        return;
    }
    console.log(`  Boxes: ${validation.stats.boxCount}, Targets: ${validation.stats.targetCount}`);

    const result = solveLevel(level);
    if (result.solvable) {
        console.log(`  SOLVABLE: solution length=${result.solutionLength}, states explored=${result.statesExplored}`);
        console.log(`  Solution: ${result.solution}`);
    } else {
        console.log(`  NOT SOLVABLE (explored ${result.statesExplored} states)`);
        allValid = false;
    }
    console.log();
});

if (allValid) {
    console.log('All levels are valid and solvable!');
    process.exit(0);
} else {
    console.log('SOME LEVELS FAILED VALIDATION');
    process.exit(1);
}
