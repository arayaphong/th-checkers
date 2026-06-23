/** @jest-environment jsdom */

import { describe, expect, test } from '@jest/globals';

// @ts-ignore - browser service is plain JavaScript
import { Starfield } from '../../html/js/service/Starfield.js';

describe('Starfield', () => {
  test('renders the requested number of stars', () => {
    const el = document.createElement('div');
    new Starfield(el, { count: 12, fireworkCount: 0 }).render();
    expect(el.querySelectorAll('.star')).toHaveLength(12);
  });

  test('clears previous stars on re-render', () => {
    const el = document.createElement('div');
    const field = new Starfield(el, { count: 5, fireworkCount: 0 });
    field.render();
    field.render();
    expect(el.querySelectorAll('.star')).toHaveLength(5);
  });

  test('is a no-op when the container is missing', () => {
    expect(() => new Starfield(null).render()).not.toThrow();
  });

  test('positions each star with size, offset, and animation styles', () => {
    const el = document.createElement('div');
    new Starfield(el, { count: 1, fireworkCount: 0 }).render();
    const star = el.querySelector<HTMLElement>('.star')!;
    expect(star.style.width).toMatch(/px$/);
    expect(star.style.left).toMatch(/%$/);
    expect(star.style.animationDuration).toMatch(/s$/);
  });

  test('renders configured firework bursts with sparks', () => {
    const el = document.createElement('div');
    new Starfield(el, { count: 0, fireworkCount: 3, sparkCount: 8 }).render();
    expect(el.querySelectorAll('.firework-burst')).toHaveLength(3);
    expect(el.querySelectorAll('.firework-spark')).toHaveLength(24);
  });
});
