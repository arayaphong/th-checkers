import { describe, expect, test } from '@jest/globals';

import { Game, PieceColor } from '../../dist/index.js';
import {
  BOARD_SIZE,
  COLS,
  htmlToPos,
  posToHtml,
  isDarkSquare,
  pieceColorClass,
  colorAt,
  // @ts-ignore - browser util is plain JavaScript
} from '../../html/js/util/coords.js';

describe('coords', () => {
  test('exposes board constants', () => {
    expect(BOARD_SIZE).toBe(8);
    expect(COLS).toBe('ABCDEFGH');
  });

  test('isDarkSquare follows (r + c) parity', () => {
    expect(isDarkSquare(0, 0)).toBe(false);
    expect(isDarkSquare(0, 1)).toBe(true);
    expect(isDarkSquare(1, 0)).toBe(true);
    expect(isDarkSquare(7, 7)).toBe(false);
  });

  test('htmlToPos maps (r, c) to engine (x = c, y = r)', () => {
    const pos = htmlToPos(2, 5);
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(2);
  });

  test('posToHtml is the inverse of htmlToPos for every dark square', () => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!isDarkSquare(r, c)) continue; // only dark squares are representable
        expect(posToHtml(htmlToPos(r, c))).toEqual({ r, c });
      }
    }
  });

  test('pieceColorClass maps WHITE -> p1 and BLACK -> p2', () => {
    expect(pieceColorClass(PieceColor.WHITE)).toBe('p1');
    expect(pieceColorClass(PieceColor.BLACK)).toBe('p2');
  });

  test('colorAt resolves the color of the occupying piece', () => {
    const game = new Game();
    const from = game.getMoves()[0].from;
    expect(colorAt(game.board(), from)).toBe(game.player());
  });
});
