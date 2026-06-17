import { Legals } from '../src/Legals.js';
import { Position } from '../src/Position.js';

describe('Legals - index validation', () => {
  test('getPosition rejects non-integer indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getPosition(0.5)).toThrow(RangeError);
    expect(() => legals.getPosition(0.5)).toThrow(/integer/);
    expect(() => legals.getPosition(Number.NaN)).toThrow(RangeError);
  });

  test('getPosition rejects out-of-range indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getPosition(-1)).toThrow(RangeError);
    expect(() => legals.getPosition(1)).toThrow(RangeError);
  });

  test('getMoveInfo rejects invalid indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getMoveInfo(0.5)).toThrow(RangeError);
    expect(() => legals.getMoveInfo(Number.NaN)).toThrow(RangeError);
    expect(() => legals.getMoveInfo(1)).toThrow(RangeError);
  });

  test('getCapturePieces rejects invalid indexes for capture moves', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    expect(() => legals.getCapturePieces(0.5)).toThrow(RangeError);
    expect(() => legals.getCapturePieces(Number.NaN)).toThrow(RangeError);
    expect(() => legals.getCapturePieces(1)).toThrow(RangeError);
  });
});
