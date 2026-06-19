/** @jest-environment jsdom */

// @ts-expect-error - browser service is plain JavaScript
import { Starfield } from '../../html/js/service/Starfield.js';

describe('Starfield', () => {
  test('renders the requested number of stars', () => {
    const el = document.createElement('div');
    new Starfield(el, { count: 12 }).render();
    expect(el.querySelectorAll('.star')).toHaveLength(12);
  });

  test('clears previous stars on re-render', () => {
    const el = document.createElement('div');
    const field = new Starfield(el, { count: 5 });
    field.render();
    field.render();
    expect(el.querySelectorAll('.star')).toHaveLength(5);
  });

  test('is a no-op when the container is missing', () => {
    expect(() => new Starfield(null).render()).not.toThrow();
  });

  test('positions each star with size, offset, and animation styles', () => {
    const el = document.createElement('div');
    new Starfield(el, { count: 1 }).render();
    const star = el.querySelector<HTMLElement>('.star')!;
    expect(star.style.width).toMatch(/px$/);
    expect(star.style.left).toMatch(/%$/);
    expect(star.style.animationDuration).toMatch(/s$/);
  });
});
