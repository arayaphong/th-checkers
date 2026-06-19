/** @jest-environment jsdom */

import { PieceColor } from '../../dist/index.js';
// @ts-expect-error - browser service is plain JavaScript
import { FocusManager } from '../../html/js/service/FocusManager.js';
// @ts-expect-error - browser view is plain JavaScript
import { GameOverView } from '../../html/js/view/GameOverView.js';
// @ts-expect-error - browser view is plain JavaScript
import { ViewportView } from '../../html/js/view/ViewportView.js';
// @ts-expect-error - browser model is plain JavaScript
import { ViewportStore } from '../../html/js/model/ViewportStore.js';

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function build() {
  document.body.innerHTML = `
    <section>
      <button id="outside">outside</button>
    </section>
    <div id="game-over-overlay" style="display:none">
      <div class="game-over-modal">
        <h2 id="winner-title"></h2>
        <p id="winner-desc"></p>
        <button id="review">review</button>
        <button id="play-again">play again</button>
      </div>
    </div>
    <div id="too-small-overlay" tabindex="-1" style="display:none"></div>
  `;
  const section = document.querySelector('section') as HTMLElement;
  const gameOverView = new GameOverView(document.getElementById('game-over-overlay'), {
    titleEl: document.getElementById('winner-title'),
    descEl: document.getElementById('winner-desc'),
  });
  const viewportView = new ViewportView(document.getElementById('too-small-overlay'));
  const viewportStore = new ViewportStore();
  const board = document.getElementById('outside') as HTMLElement;
  const focusManager = new FocusManager({
    section,
    gameOverView,
    viewportView,
    viewportStore,
    onFocusBoard: () => board.focus(),
  });
  return { section, gameOverView, viewportView, focusManager };
}

describe('FocusManager', () => {
  beforeEach(() => setViewport(800, 600));

  test('showGameOver inerts the game, opens the modal, and focuses the first button', () => {
    const { section, gameOverView, focusManager } = build();
    const outside = document.getElementById('outside') as HTMLElement;
    outside.focus();

    focusManager.showGameOver(PieceColor.WHITE, 'reason');

    expect(gameOverView.isOpen()).toBe(true);
    expect(section.inert).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('review'));
    expect(document.getElementById('winner-title')!.textContent).toContain('ผู้เล่น 1');
  });

  test('hideGameOver restores prior focus and releases inert when the viewport is fine', () => {
    const { section, gameOverView, focusManager } = build();
    const outside = document.getElementById('outside') as HTMLElement;
    outside.focus();

    focusManager.showGameOver(PieceColor.BLACK, 'reason');
    focusManager.hideGameOver();

    expect(gameOverView.isOpen()).toBe(false);
    expect(section.inert).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  test('checkSize shows the warning when too small and restores when it grows back', () => {
    const { section, viewportView, focusManager } = build();
    const outside = document.getElementById('outside') as HTMLElement;
    outside.focus();

    setViewport(500, 600);
    focusManager.checkSize();
    expect(viewportView.isOpen()).toBe(true);
    expect(section.inert).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('too-small-overlay'));

    setViewport(800, 600);
    focusManager.checkSize();
    expect(viewportView.isOpen()).toBe(false);
    expect(section.inert).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  test('closing the modal while too small hands off to the viewport warning', () => {
    const { gameOverView, viewportView, focusManager } = build();
    (document.getElementById('outside') as HTMLElement).focus();

    focusManager.showGameOver(PieceColor.WHITE, 'reason');

    setViewport(500, 600);
    focusManager.checkSize(); // no-op visually while the modal is open
    expect(viewportView.isOpen()).toBe(false);

    focusManager.hideGameOver();
    expect(gameOverView.isOpen()).toBe(false);
    expect(viewportView.isOpen()).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('too-small-overlay'));
  });
});
