/** @jest-environment jsdom */

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

import { readFileSync } from 'node:fs';

let reducedMotion = true;

class FakeAudioContext {
  static rejectResume = false;
  static created = 0;
  static closed = 0;

  state = 'suspended';
  currentTime = 0;
  destination = {};

  constructor() {
    FakeAudioContext.created++;
  }

  async resume(): Promise<void> {
    if (FakeAudioContext.rejectResume) throw new Error('Audio unavailable');
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.state = 'closed';
    FakeAudioContext.closed++;
  }

  createOscillator() {
    return {
      connect() {},
      frequency: {
        exponentialRampToValueAtTime() {},
        setValueAtTime() {},
      },
      start() {},
      stop() {},
      type: 'sine',
    };
  }

  createGain() {
    return {
      connect() {},
      gain: {
        exponentialRampToValueAtTime() {},
        linearRampToValueAtTime() {},
        setValueAtTime() {},
      },
    };
  }
}

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

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

function square(coordinate: string): HTMLElement {
  const c = coordinate.charCodeAt(0) - 'A'.charCodeAt(0);
  const r = Number(coordinate.slice(1)) - 1;
  const found = document.querySelector<HTMLElement>(`.square[data-r="${r}"][data-c="${c}"]`);
  if (!found) throw new Error(`Missing square ${coordinate}`);
  return found;
}

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function key(target: HTMLElement, value: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value, shiftKey }));
}

function move(from: string, to: string): void {
  const origin = square(from);
  origin.focus();
  origin.click();
  expect(square(from).getAttribute('aria-selected')).toBe('true');

  const target = square(to);
  expect(target.classList.contains('valid-move')).toBe(true);
  target.focus();
  target.click();
}

function moveFirstLegal(): void {
  const origin = document.querySelector<HTMLElement>('.piece.movable')?.parentElement;
  if (!origin) throw new Error('No movable piece');
  origin.click();
  const target = document.querySelector<HTMLElement>('.square.valid-move');
  if (!target) throw new Error('No legal target');
  target.click();
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

describe('HTML game client', () => {
  beforeAll(async () => {
    const html = readFileSync(new URL('../../html/index.html', import.meta.url), 'utf8');
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    document.head.innerHTML = parsed.head.innerHTML;
    document.body.innerHTML = parsed.body.innerHTML.replace(
      '<script type="module" src="game.js"></script>',
      '',
    );

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: reducedMotion }),
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    });
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(window.performance.now()), 0);
    setViewport(800, 600);

    // @ts-ignore The browser client is intentionally plain JavaScript.
    await import('../../html/game.js');
    window.dispatchEvent(new Event('load'));
  });

  beforeEach(() => {
    reducedMotion = true;
    FakeAudioContext.rejectResume = false;
    localStorage.clear();
    setViewport(800, 600);
    const overlay = element<HTMLElement>('game-over-overlay');
    if (overlay.style.display === 'flex') {
      element<HTMLButtonElement>('btn-play-again').click();
    } else {
      element<HTMLButtonElement>('btn-reset').click();
    }
  });

  test('closes an audio context when activation fails', async () => {
    const createdBefore = FakeAudioContext.created;
    const closedBefore = FakeAudioContext.closed;
    FakeAudioContext.rejectResume = true;

    key(document.body, 'a');
    await wait(0);

    expect(FakeAudioContext.created).toBe(createdBefore + 1);
    expect(FakeAudioContext.closed).toBe(closedBefore + 1);
  });

  test('supports keyboard selection, moves, undo, and redo', () => {
    const origin = document.querySelector<HTMLElement>('.piece.movable')?.parentElement;
    expect(origin).toBeTruthy();
    const originSelector = `.square[data-r="${origin!.dataset.r}"][data-c="${origin!.dataset.c}"]`;
    origin!.focus();
    key(origin!, 'Enter');

    expect(document.querySelector(originSelector)?.getAttribute('aria-selected')).toBe('true');
    const target = document.querySelector<HTMLElement>('.square.valid-move');
    expect(target).toBeTruthy();
    target!.focus();
    key(target!, ' ');

    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
    expect(element('turn-announcement').textContent).toBe('ตาของผู้เล่นกระตั้ว');
    expect(element<HTMLButtonElement>('btn-undo').disabled).toBe(false);

    element<HTMLButtonElement>('btn-undo').click();
    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
    expect(document.querySelectorAll('.history-entry.future')).toHaveLength(1);
    expect(element('turn-announcement').textContent).toBe('ตาของผู้เล่นมาคอว์');
    expect(element<HTMLButtonElement>('btn-redo').disabled).toBe(false);

    element<HTMLButtonElement>('btn-redo').click();
    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
    expect(element('turn-announcement').textContent).toBe('ตาของผู้เล่นกระตั้ว');
  });

  test('announces and blocks the game when the viewport is too small', () => {
    const reset = element<HTMLButtonElement>('btn-reset');
    const warning = element<HTMLElement>('too-small-overlay');
    const section = document.querySelector<HTMLElement>('section')!;
    reset.focus();

    setViewport(500, 600);
    expect(warning.getAttribute('role')).toBe('alertdialog');
    expect(warning.getAttribute('aria-hidden')).toBe('false');
    expect(warning.style.display).toBe('flex');
    expect(section.inert).toBe(true);
    expect(document.activeElement).toBe(warning);

    setViewport(800, 600);
    expect(warning.getAttribute('aria-hidden')).toBe('true');
    expect(warning.style.display).toBe('none');
    expect(section.inert).toBe(false);
    expect(document.activeElement).toBe(reset);
  });

  test('renders captures, promotion, and accessible history summaries', () => {
    for (const [from, to] of TERMINAL_GAME.slice(0, 10)) move(from, to);

    expect(square('G8').querySelector('.piece.king')).not.toBeNull();
    expect(element('captured-by-p1').textContent).toContain('ยังไม่ได้กินหมาก');
    expect(element('captured-by-p2').textContent).toContain('กินหมากของผู้เล่นมาคอว์');
    expect(document.querySelectorAll('.history-entry')).toHaveLength(10);
    expect(document.querySelector('.history-entry[aria-current="step"]')).not.toBeNull();
    expect(document.querySelector('.history-entry.current .sr-only')?.textContent).toContain(
      'ตำแหน่งปัจจุบัน',
    );
  });

  test('clears redo history after making a new move from an undone position', () => {
    move(...TERMINAL_GAME[0]);
    move(...TERMINAL_GAME[1]);
    element<HTMLButtonElement>('btn-undo').click();
    expect(element<HTMLButtonElement>('btn-redo').disabled).toBe(false);

    moveFirstLegal();

    expect(document.querySelectorAll('.history-entry')).toHaveLength(2);
    expect(element<HTMLButtonElement>('btn-redo').disabled).toBe(true);
  });

  test('completes moves through the animated path', async () => {
    reducedMotion = false;
    const origin = document.querySelector<HTMLElement>('.piece.movable')?.parentElement;
    if (!origin) throw new Error('No movable piece');
    origin.click();
    const target = document.querySelector<HTMLElement>('.square.valid-move');
    if (!target) throw new Error('No legal target');
    target.click();

    expect(document.querySelectorAll('.history-entry')).toHaveLength(0);
    await wait(350);
    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
  });

  test('manages dialog focus and terminal state through a complete game', () => {
    for (const [from, to] of TERMINAL_GAME) move(from, to);

    const overlay = element<HTMLElement>('game-over-overlay');
    const review = element<HTMLButtonElement>('btn-review-game');
    const playAgain = element<HTMLButtonElement>('btn-play-again');
    const board = element<HTMLElement>('board');
    const section = document.querySelector<HTMLElement>('section')!;

    expect(overlay.style.display).toBe('flex');
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(review);
    expect(section.inert).toBe(true);
    expect(board.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('.player-card.active-p1, .player-card.active-p2')).toBeNull();

    key(review, 'Tab', true);
    expect(document.activeElement).toBe(playAgain);
    key(playAgain, 'Tab');
    expect(document.activeElement).toBe(review);

    setViewport(500, 600);
    expect(element<HTMLElement>('too-small-overlay').style.display).toBe('none');
    review.click();
    expect(element<HTMLElement>('too-small-overlay').style.display).toBe('flex');
    expect(document.activeElement).toBe(element('too-small-overlay'));
    setViewport(800, 600);
    expect(overlay.style.display).toBe('none');
    expect(section.inert).toBe(false);
    expect(document.activeElement).toBe(square('F7'));

    element<HTMLButtonElement>('btn-undo').click();
    expect(board.getAttribute('aria-disabled')).toBe('false');
    expect(document.querySelector('.player-card.active-p1, .player-card.active-p2')).not.toBeNull();
  });

  test('toggles sound on and off', () => {
    const soundButton = element<HTMLButtonElement>('btn-sound');
    expect(soundButton.textContent).toBe('🔊');
    soundButton.click();
    expect(soundButton.textContent).toBe('🔇');
    soundButton.click();
    expect(soundButton.textContent).toBe('🔊');
  });

  test('switches language between Thai and English', () => {
    const languageButton = element<HTMLButtonElement>('btn-language');
    expect(document.documentElement.lang).toBe('th');
    expect(languageButton.textContent).toBe('EN');

    languageButton.click();
    expect(document.documentElement.lang).toBe('en');
    expect(languageButton.textContent).toBe('TH');
    expect(document.getElementById('board')!.getAttribute('aria-label')).toBe('Checkers board');

    languageButton.click();
    expect(document.documentElement.lang).toBe('th');
    expect(languageButton.textContent).toBe('EN');
  });
});
