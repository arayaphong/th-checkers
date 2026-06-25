import { describe, expect, test } from '@jest/globals';

import { Board, Game, PieceColor, PieceType, Position } from '../../dist/index.js';
// @ts-ignore - browser core is plain JavaScript
import { Events } from '../../html/js/core/events.js';
// @ts-ignore - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';
// @ts-ignore - browser model is plain JavaScript
import { MatchStore } from '../../html/js/model/MatchStore.js';

function withFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => (data.has(key) ? String(data.get(key)) : null),
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };

  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const previous = (globalThis as { localStorage?: unknown }).localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  return {
    storage,
    restore: () => {
      if (hadStorage) {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          value: previous,
        });
      } else {
        // @ts-expect-error test cleanup for injected global
        delete globalThis.localStorage;
      }
    },
  };
}

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
    expect(store.historyEntries()).toHaveLength(1);
    expect(store.historyEntries()[0]).toMatchObject({ isCurrent: false, isFuture: true });

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

  test('restores board history and index from localStorage snapshot', () => {
    const snapshot = JSON.stringify({ version: 1, moveIndexes: [0, 0], index: 1 });
    const fake = withFakeStorage({ [MatchStore.STORAGE_KEY]: snapshot });

    try {
      const { store } = newStore();
      expect(store.index()).toBe(1);
      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(true);
      expect(store.historyEntries()).toHaveLength(2);
      expect(store.historyEntries()[0]).toMatchObject({ isCurrent: true, isFuture: false });
      expect(store.historyEntries()[1]).toMatchObject({ isCurrent: false, isFuture: true });
      expect(store.lastMove()).toBeTruthy();
    } finally {
      fake.restore();
    }
  });

  test('persists v2 snapshot including initial board after changes', () => {
    const fake = withFakeStorage();

    try {
      const { store } = newStore();
      store.commit(0);
      store.commit(0);
      store.undo();

      const raw = fake.storage.getItem(MatchStore.STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw as string);
      expect(parsed.version).toBe(2);
      expect(parsed.moveIndexes).toEqual([0, 0]);
      expect(parsed.index).toBe(1);
      expect(typeof parsed.initialBoard).toBe('string');
      expect(parsed.initialBoard).toBe(new Game().board().encode().toString());
    } finally {
      fake.restore();
    }
  });

  test('accepts a custom initial game in the constructor', () => {
    const custom = new Game(Board.fromPieces([
      [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]));

    const bus = new EventBus();
    const store = new MatchStore(bus, { initialGame: custom });

    expect(store.index()).toBe(0);
    expect(store.game().board().getPieces(PieceColor.WHITE).size).toBe(1);
    expect(store.game().board().getPieces(PieceColor.BLACK).size).toBe(1);
  });

  test('loadCustomGame resets history and starts from the loaded position', () => {
    const { store, changes } = newStore();
    store.commit(0);
    expect(store.index()).toBe(1);

    const custom = new Game(Board.fromPieces([
      [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]));

    const before = changes();
    store.loadCustomGame(custom);

    expect(store.index()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    expect(store.historyEntries()).toEqual([]);
    expect(store.game().board().getPieces(PieceColor.WHITE).size).toBe(1);
    expect(store.game().board().getPieces(PieceColor.BLACK).size).toBe(1);
    expect(changes()).toBe(before + 1);
  });

  test('reset returns to the standard setup after a custom game was loaded', () => {
    const custom = new Game(Board.fromPieces([
      [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]));

    const { store } = newStore();
    store.loadCustomGame(custom);
    expect(store.game().board().getPieces(PieceColor.WHITE).size).toBe(1);

    store.reset();
    expect(store.game().board().getPieces(PieceColor.WHITE).size).toBe(8);
    expect(store.game().board().getPieces(PieceColor.BLACK).size).toBe(8);
  });

  test('v2 snapshot round-trips a custom initial board', () => {
    const custom = new Game(Board.fromPieces([
      [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]));

    const fake = withFakeStorage();
    try {
      const bus = new EventBus();
      const store = new MatchStore(bus, { initialGame: custom });
      store.commit(0);

      const restored = new MatchStore(bus);
      expect(restored.index()).toBe(1);
      // The only white piece captured the only black piece on the first move.
      expect(restored.game().board().getPieces(PieceColor.WHITE).size).toBe(1);
      expect(restored.game().board().getPieces(PieceColor.BLACK).size).toBe(0);
    } finally {
      fake.restore();
    }
  });
});
