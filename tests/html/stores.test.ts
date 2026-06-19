/** @jest-environment jsdom */

// @ts-expect-error - browser model is plain JavaScript
import { SelectionStore } from '../../html/js/model/SelectionStore.js';
// @ts-expect-error - browser model is plain JavaScript
import { ViewportStore } from '../../html/js/model/ViewportStore.js';

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

describe('SelectionStore', () => {
  test('starts empty and not animating', () => {
    const store = new SelectionStore();
    expect(store.selected()).toBeNull();
    expect(store.validMoves()).toEqual([]);
    expect(store.hasSelection()).toBe(false);
    expect(store.isAnimating()).toBe(false);
  });

  test('select records the square and its targets', () => {
    const store = new SelectionStore();
    const targets = [{ r: 1, c: 0, moveIndex: 0 }];
    store.select({ r: 0, c: 1 }, targets);
    expect(store.selected()).toEqual({ r: 0, c: 1 });
    expect(store.validMoves()).toBe(targets);
    expect(store.hasSelection()).toBe(true);
  });

  test('clear resets selection but leaves the animation flag', () => {
    const store = new SelectionStore();
    store.select({ r: 0, c: 1 }, [{ r: 1, c: 0 }]);
    store.setAnimating(true);
    store.clear();
    expect(store.hasSelection()).toBe(false);
    expect(store.validMoves()).toEqual([]);
    expect(store.isAnimating()).toBe(true);
  });
});

describe('ViewportStore', () => {
  test('refresh reflects the window size against the threshold', () => {
    const store = new ViewportStore({ minWidth: 600, minHeight: 480 });

    setViewport(800, 600);
    expect(store.refresh()).toBe(false);
    expect(store.isTooSmall()).toBe(false);

    setViewport(500, 600);
    expect(store.refresh()).toBe(true);
    expect(store.isTooSmall()).toBe(true);

    setViewport(800, 400);
    expect(store.refresh()).toBe(true);
  });

  test('isTooSmall returns the last refreshed value without re-reading', () => {
    const store = new ViewportStore();
    setViewport(500, 600);
    store.refresh();
    setViewport(800, 600); // not refreshed yet
    expect(store.isTooSmall()).toBe(true);
  });
});
