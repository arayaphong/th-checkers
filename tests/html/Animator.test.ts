/** @jest-environment jsdom */

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

// @ts-ignore - browser service is plain JavaScript
import { Animator } from '../../html/js/service/Animator.js';

let reducedMotion = true;

function setReducedMotion(value: boolean): void {
  reducedMotion = value;
}

function squareWithPiece(r: number, c: number): HTMLElement {
  const square = document.createElement('div');
  square.className = 'square';
  square.dataset.r = String(r);
  square.dataset.c = String(c);
  const piece = document.createElement('div');
  piece.className = 'piece';
  square.appendChild(piece);
  document.body.appendChild(square);
  return square;
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: reducedMotion }),
  });
  window.requestAnimationFrame = (cb) =>
    window.setTimeout(() => cb(window.performance.now()), 0) as unknown as number;
});

beforeEach(() => {
  document.body.innerHTML = '';
  reducedMotion = true;
});

describe('Animator', () => {
  test('invokes onDone synchronously when reduced motion is preferred', () => {
    setReducedMotion(true);
    let done = false;
    new Animator().move({ from: { r: 0, c: 1 }, to: { r: 1, c: 0 } }, () => {
      done = true;
    });
    expect(done).toBe(true);
  });

  test('invokes onDone synchronously when the source piece is missing', () => {
    setReducedMotion(false);
    let done = false;
    new Animator().move({ from: { r: 5, c: 5 }, to: { r: 4, c: 4 } }, () => {
      done = true;
    });
    expect(done).toBe(true);
  });

  test('animates then completes, fading captured pieces along the way', async () => {
    setReducedMotion(false);
    squareWithPiece(0, 1);
    const target = squareWithPiece(1, 0);
    const captured = squareWithPiece(0, 3);

    let done = false;
    new Animator().move(
      { from: { r: 0, c: 1 }, to: { r: 1, c: 0 }, captured: [{ r: 0, c: 3 }] },
      () => {
        done = true;
      },
    );

    expect(captured.querySelector<HTMLElement>('.piece')!.style.opacity).toBe('0');
    expect(done).toBe(false);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(done).toBe(true);
    expect(target).toBeTruthy();
  });
});
