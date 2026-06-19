/** @jest-environment jsdom */

// @ts-expect-error - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';
// @ts-expect-error - browser model is plain JavaScript
import { MatchStore } from '../../html/js/model/MatchStore.js';
// @ts-expect-error - browser view is plain JavaScript
import { BoardView } from '../../html/js/view/BoardView.js';
// @ts-expect-error - browser view is plain JavaScript
import { HistoryView } from '../../html/js/view/HistoryView.js';
// @ts-expect-error - browser view is plain JavaScript
import { StatsView } from '../../html/js/view/StatsView.js';
// @ts-expect-error - browser view is plain JavaScript
import { StatusView } from '../../html/js/view/StatusView.js';

function newStore() {
  return new MatchStore(new EventBus());
}

describe('BoardView', () => {
  test('renders an 8x8 grid and forwards dark-square activation', () => {
    const boardEl = document.createElement('div');
    const activations: Array<[number, number]> = [];
    const view = new BoardView(boardEl, {
      matchStore: newStore(),
      onActivate: (r: number, c: number) => activations.push([r, c]),
    });

    view.render({ selectedSquare: null, validMoves: [] });

    expect(boardEl.querySelectorAll('.square')).toHaveLength(64);
    expect(boardEl.getAttribute('aria-disabled')).toBe('false');

    const dark = boardEl.querySelector<HTMLElement>('.square.dark')!;
    dark.click();
    expect(activations).toHaveLength(1);

    const light = boardEl.querySelector<HTMLElement>('.square.light')!;
    light.click();
    expect(activations).toHaveLength(1); // light squares do not activate
  });

  test('marks selected and valid-move squares from the supplied state', () => {
    const boardEl = document.createElement('div');
    const view = new BoardView(boardEl, { matchStore: newStore(), onActivate: () => {} });

    view.render({ selectedSquare: { r: 0, c: 1 }, validMoves: [{ r: 1, c: 0 }] });

    expect(boardEl.querySelector('.square[data-r="0"][data-c="1"]')!.classList).toContain(
      'selected',
    );
    expect(boardEl.querySelector('.square[data-r="1"][data-c="0"]')!.classList).toContain(
      'valid-move',
    );
  });
});

describe('HistoryView', () => {
  test('renders one entry per played move and marks the current one', () => {
    const listEl = document.createElement('div');
    const store = newStore();
    const view = new HistoryView(listEl, { matchStore: store });

    view.render();
    expect(listEl.querySelectorAll('.history-entry')).toHaveLength(0);

    store.commit(0);
    view.render();
    const entries = listEl.querySelectorAll('.history-entry');
    expect(entries).toHaveLength(1);
    expect(entries[0].getAttribute('aria-current')).toBe('step');
  });
});

describe('StatsView', () => {
  test('shows the empty-tray summary before any capture', () => {
    const p1 = document.createElement('div');
    const p2 = document.createElement('div');
    new StatsView({
      matchStore: newStore(),
      capturedByP1El: p1,
      capturedByP2El: p2,
    }).render();

    expect(p1.textContent).toContain('ยังไม่ได้กินหมาก');
    expect(p1.querySelector('.no-captures')).not.toBeNull();
  });
});

describe('StatusView', () => {
  function build(store = newStore()) {
    const els = {
      cardP1: document.createElement('div'),
      cardP2: document.createElement('div'),
      turnAnnouncement: document.createElement('div'),
      btnUndo: document.createElement('button'),
      btnRedo: document.createElement('button'),
    };
    const view = new StatusView({ matchStore: store, ...els });
    return { view, els, store };
  }

  test('highlights the active player and toggles undo/redo availability', () => {
    const { view, els, store } = build();

    view.render({ isAnimating: false });
    expect(els.cardP1.className).toBe('player-card active-p1');
    expect(els.turnAnnouncement.textContent).toBe('ตาของผู้เล่น 1');
    expect(els.btnUndo.disabled).toBe(true);

    store.commit(0);
    view.render({ isAnimating: false });
    expect(els.cardP2.className).toBe('player-card active-p2');
    expect(els.btnUndo.disabled).toBe(false);
  });

  test('re-announces the turn after resetAnnouncement', () => {
    const { view, els } = build();
    view.render({ isAnimating: false });
    els.turnAnnouncement.textContent = '';

    view.render({ isAnimating: false }); // no change -> stays silent
    expect(els.turnAnnouncement.textContent).toBe('');

    view.resetAnnouncement();
    view.render({ isAnimating: false });
    expect(els.turnAnnouncement.textContent).toBe('ตาของผู้เล่น 1');
  });
});
