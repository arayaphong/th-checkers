// @ts-expect-error - browser core is plain JavaScript
import { Events } from '../../html/js/core/events.js';
// @ts-expect-error - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';
// @ts-expect-error - browser model is plain JavaScript
import { MatchStore } from '../../html/js/model/MatchStore.js';

function newStore() {
  const bus = new EventBus();
  let changes = 0;
  bus.on(Events.MATCH_CHANGED, () => {
    changes++;
  });
  const store = new MatchStore(bus);
  return { store, changes: () => changes };
}

describe('MatchStore', () => {
  test('starts at the initial position with nothing to undo or redo', () => {
    const { store } = newStore();
    expect(store.index()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    expect(store.isGameOver()).toBe(false);
    expect(store.historyEntries()).toEqual([]);
    expect(store.lastMove()).toBeNull();
    expect(store.lastPromotion()).toBe(false);
  });

  test('commit advances history, records the move, and emits', () => {
    const { store, changes } = newStore();
    const result = store.commit(0);

    expect(store.index()).toBe(1);
    expect(store.canUndo()).toBe(true);
    expect(store.canRedo()).toBe(false);
    expect(changes()).toBe(1);

    const entries = store.historyEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ index: 1, isCurrent: true });
    expect(store.lastMove()).toMatchObject({ move: result.move, mover: result.mover });
    expect(result.promoted).toBe(false);
  });

  test('undo and redo move along history and toggle availability', () => {
    const { store } = newStore();
    store.commit(0);

    expect(store.undo()).toBe(true);
    expect(store.index()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(true);
    expect(store.lastPromotion()).toBe(false);

    expect(store.redo()).toBe(true);
    expect(store.index()).toBe(1);

    // No-ops at the ends return false.
    store.undo();
    expect(store.undo()).toBe(false);
  });

  test('committing after an undo truncates the redo branch', () => {
    const { store } = newStore();
    store.commit(0);
    store.undo();
    expect(store.canRedo()).toBe(true);

    store.commit(0);
    expect(store.canRedo()).toBe(false);
    expect(store.index()).toBe(1);
  });

  test('reset returns to the initial position and emits', () => {
    const { store, changes } = newStore();
    store.commit(0);
    const before = changes();

    store.reset();
    expect(store.index()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect(store.historyEntries()).toEqual([]);
    expect(changes()).toBe(before + 1);
  });

  test('capturedPieces is empty before any capture', () => {
    const { store } = newStore();
    store.commit(0);
    const { capturedByP1, capturedByP2 } = store.capturedPieces();
    expect(capturedByP1).toEqual([]);
    expect(capturedByP2).toEqual([]);
  });
});
