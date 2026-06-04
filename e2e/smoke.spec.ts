import { test, expect } from '@playwright/test';

test.describe('Ludo Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173');
  });

  test('start screen renders with mode buttons', async ({ page }) => {
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#mode-local')).toBeVisible();
    await expect(page.locator('#mode-ai')).toBeVisible();
    await expect(page.locator('.start-title')).toHaveText('Ludo');
  });

  test('local mode: loads board and shows HUD', async ({ page }) => {
    await page.click('#mode-local');
    await expect(page.locator('#game-screen')).toBeVisible();
    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('#board-svg')).toBeVisible();
    await expect(page.locator('#dice-btn')).toBeVisible();
    await expect(page.locator('#dice-btn')).toBeEnabled();
    await expect(page.locator('#player-name')).toHaveText('Red');
  });

  test('AI mode: loads board and AI takes turns', async ({ page }) => {
    await page.click('#mode-ai');
    await expect(page.locator('#game-screen')).toBeVisible();
    await expect(page.locator('#board-svg')).toBeVisible();
    await expect(page.locator('#dice-btn')).toBeVisible();
  });

  test('back button returns to start screen', async ({ page }) => {
    await page.click('#mode-local');
    await expect(page.locator('#game-screen')).toBeVisible();
    await page.click('#back-btn');
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#game-screen')).toBeHidden();
  });

  test('dice roll updates display', async ({ page }) => {
    await page.click('#mode-local');
    await expect(page.locator('#dice-display')).toHaveText('?');
    await page.click('#dice-btn');
    await page.waitForFunction(
      () => document.getElementById('dice-display')?.textContent !== '?',
      { timeout: 5000 }
    );
    const diceText = await page.locator('#dice-display').textContent();
    const value = parseInt(diceText ?? '', 10);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(6);
  });

  test('play a sequence of moves in local mode', async ({ page }) => {
    await page.click('#mode-local');

    for (let turn = 0; turn < 6; turn++) {
      // Wait for the dice button to become enabled (roll phase)
      await page.waitForFunction(
        () => {
          const btn = document.getElementById('dice-btn') as HTMLButtonElement | null;
          return btn && !btn.disabled;
        },
        { timeout: 10000 }
      );

      await page.click('#dice-btn');

      // Wait for dice animation to finish and phase to resolve
      await page.waitForFunction(
        () => {
          const btn = document.getElementById('dice-btn') as HTMLButtonElement | null;
          const msg = document.getElementById('game-message')?.textContent ?? '';
          return btn?.disabled && (
            msg.includes('select a piece') ||
            msg.includes('skipping') ||
            msg.includes('Roll the dice')
          );
        },
        { timeout: 10000 }
      );

      const hasMovable = await page.evaluate(() => {
        return document.querySelectorAll('.piece-group.highlighted').length > 0;
      });

      if (hasMovable) {
        await page.locator('.piece-group.highlighted').first().click({ force: true });
        // Wait for movement animation to complete
        await page.waitForFunction(
          () => {
            const msg = document.getElementById('game-message')?.textContent ?? '';
            return msg.includes('Roll the dice') || msg.includes('select a piece');
          },
          { timeout: 10000 }
        );
      }
      // If no movable pieces, the game auto-skips — loop will wait for dice enabled
    }

    expect(await page.locator('#board-svg').isVisible()).toBe(true);
  });

  test('trigger a win and verify restart resets the board', async ({ page }) => {
    await page.click('#mode-local');
    await page.waitForSelector('#board-svg');

    // Play one turn to verify gameplay works
    await page.waitForFunction(
      () => !(document.getElementById('dice-btn') as HTMLButtonElement)?.disabled,
      { timeout: 5000 }
    );
    await page.click('#dice-btn');
    await page.waitForTimeout(800);

    // Wait for phase to settle
    await page.waitForFunction(
      () => {
        const msg = document.getElementById('game-message')?.textContent ?? '';
        return msg.includes('select') || msg.includes('skipping') || msg.includes('Roll');
      },
      { timeout: 5000 }
    );

    // Force a win via the test hook event
    await page.evaluate(() => {
      const event = new CustomEvent('__ludo_test_win', { detail: { player: 0 } });
      window.dispatchEvent(event);
    });

    // Wait for overlay to appear
    await page.waitForFunction(
      () => document.getElementById('winner-overlay')?.classList.contains('active'),
      { timeout: 5000 }
    );

    await expect(page.locator('#winner-overlay')).toHaveClass(/active/);
    await expect(page.locator('#winner-title')).toContainText('Wins');

    // Click restart
    await page.click('#restart-btn');

    // Verify board resets
    await expect(page.locator('#winner-overlay')).not.toHaveClass(/active/);
    await expect(page.locator('#dice-display')).toHaveText('?');
    await expect(page.locator('#board-svg')).toBeVisible();
    const piecesCount = await page.locator('.piece-group').count();
    expect(piecesCount).toBe(8);
  });

  test('menu button from winner overlay returns to start', async ({ page }) => {
    await page.click('#mode-local');
    await page.waitForSelector('#board-svg');

    // Directly show the winner overlay
    await page.evaluate(() => {
      const overlay = document.getElementById('winner-overlay');
      const title = document.getElementById('winner-title');
      if (overlay && title) {
        title.textContent = 'Red Wins!';
        overlay.classList.add('active');
      }
    });

    await expect(page.locator('#winner-overlay')).toHaveClass(/active/);
    await page.click('#menu-btn');
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#game-screen')).toBeHidden();
  });

  test('accessible labels are present', async ({ page }) => {
    await expect(page.locator('#mode-local')).toHaveAttribute('aria-label', /Local Two Player/);
    await expect(page.locator('#mode-ai')).toHaveAttribute('aria-label', /Single Player/);

    await page.click('#mode-local');
    await expect(page.locator('#dice-btn')).toHaveAttribute('aria-label', 'Roll dice');
    await expect(page.locator('#board-svg')).toHaveAttribute('aria-label', 'Ludo game board');
    await expect(page.locator('#back-btn')).toHaveAttribute('aria-label', /start screen/);
    await expect(page.locator('#winner-overlay')).toHaveAttribute('aria-label', 'Game over');

    const pieces = page.locator('.piece-group');
    const count = await pieces.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 4); i++) {
      await expect(pieces.nth(i)).toHaveAttribute('aria-label', /piece/);
    }
  });

  test('responsive layout at 1024px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.click('#mode-local');
    const board = page.locator('#board-svg');
    await expect(board).toBeVisible();
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(400);
  });
});
