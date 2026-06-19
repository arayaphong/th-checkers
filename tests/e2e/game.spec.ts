import { expect, test, type Page } from '@playwright/test';

const TERMINAL_GAME = [
  ['H7', 'G6'],
  ['E2', 'D3'],
  ['B7', 'C6'],
  ['G2', 'H3'],
  ['G8', 'H7'],
  ['F1', 'G2'],
  ['C8', 'B7'],
  ['D3', 'C4'],
  ['C6', 'D5'],
  ['C4', 'G8'],
  ['E8', 'F7'],
  ['G8', 'A6'],
  ['G6', 'F5'],
  ['G2', 'F3'],
  ['F5', 'G4'],
  ['F3', 'H5'],
  ['A8', 'B7'],
  ['A6', 'C8'],
  ['H7', 'G6'],
  ['H5', 'F7'],
] as const;

function square(page: Page, coordinate: string) {
  const c = coordinate.charCodeAt(0) - 'A'.charCodeAt(0);
  const r = Number(coordinate.slice(1)) - 1;
  return page.locator(`.square[data-r="${r}"][data-c="${c}"]`);
}

test('plays a complete keyboard-accessible game and reviews the result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  const firstOrigin = square(page, TERMINAL_GAME[0][0]);
  const firstTarget = square(page, TERMINAL_GAME[0][1]);
  await firstOrigin.focus();
  await page.keyboard.press('Enter');
  await expect(firstOrigin).toHaveAttribute('aria-selected', 'true');
  await expect(firstTarget).toHaveClass(/valid-move/);
  await firstTarget.focus();
  await page.keyboard.press('Space');

  for (const [from, to] of TERMINAL_GAME.slice(1)) {
    await square(page, from).click();
    await expect(square(page, to)).toHaveClass(/valid-move/);
    await square(page, to).click();
  }

  await expect(page.locator('.history-entry')).toHaveCount(20);
  await expect(page.locator('#captured-by-p2 .sr-only')).toContainText('กินหมากของผู้เล่น 1');
  await expect(page.locator('#game-over-overlay')).toBeVisible();
  await expect(page.locator('#board')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#btn-review-game')).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#btn-play-again')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#btn-review-game')).toBeFocused();

  await page.locator('#btn-review-game').click();
  await expect(page.locator('#game-over-overlay')).toBeHidden();
  await expect(square(page, 'F7')).toBeFocused();

  await page.setViewportSize({ width: 500, height: 600 });
  await expect(page.locator('#too-small-overlay')).toBeVisible();
  await expect(page.locator('#too-small-overlay')).toBeFocused();
  await expect(page.locator('section')).toHaveJSProperty('inert', true);
});
