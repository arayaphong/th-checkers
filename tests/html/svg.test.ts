import { describe, expect, test } from '@jest/globals';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const htmlDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../html');
const svgDir = resolve(htmlDir, 'svg');

function readHtml(file: string): string {
  return readFileSync(resolve(htmlDir, file), 'utf8');
}

function readSvg(name: string): string {
  return readFileSync(resolve(svgDir, name), 'utf8');
}

describe('SVG assets', () => {
  test.each([
    ['warning.svg'],
    ['undo.svg'],
    ['redo.svg'],
    ['reset.svg'],
    ['crown.svg'],
    ['capture.svg'],
    ['king-crown.svg'],
  ])('%s exists and defines an #icon symbol', (name) => {
    const content = readSvg(name);
    expect(content.trim()).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(content).toContain('id="icon"');
  });

  test('index.html references external SVGs instead of inline paths', () => {
    const html = readHtml('index.html');

    expect(html).toContain('<use href="svg/warning.svg#icon"></use>');
    expect(html).toContain('<use href="svg/undo.svg#icon"></use>');
    expect(html).toContain('<use href="svg/redo.svg#icon"></use>');
    expect(html).toContain('<use href="svg/reset.svg#icon"></use>');

    // No inline path/polygon/circle definitions should remain.
    expect(html).not.toContain('<path ');
    expect(html).not.toContain('<polygon ');
    expect(html).not.toContain('<circle ');
  });

  test('style.css references the external king crown SVG', () => {
    const css = readHtml('style.css');
    expect(css).toContain('url("svg/king-crown.svg")');
    expect(css).not.toContain('data:image/svg+xml');
  });

  test('view modules reference external SVG files', () => {
    const statsView = readHtml('js/view/StatsView.js');
    const historyView = readHtml('js/view/HistoryView.js');

    expect(statsView).toContain('svg/crown.svg#icon');
    expect(statsView).not.toContain('<polygon');

    expect(historyView).toContain('svg/capture.svg#icon');
    expect(historyView).not.toContain('<circle');
  });
});
