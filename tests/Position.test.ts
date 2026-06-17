import { Position } from '../src/Position.js';

describe('Position - fromString', () => {
  test('parses exact algebraic notation', () => {
    expect(Position.fromString('B1').toString()).toBe('B1');
    expect(Position.fromString('C4').toString()).toBe('C4');
    expect(Position.fromString('G8').toString()).toBe('G8');
  });

  test('rejects trailing characters', () => {
    expect(() => Position.fromString('C4extra')).toThrow(/Invalid position string/);
    expect(() => Position.fromString('B1x')).toThrow(/Invalid position string/);
  });

  test('rejects multi-digit rows', () => {
    expect(() => Position.fromString('B10')).toThrow(/Invalid position string/);
  });

  test('rejects lowercase notation', () => {
    expect(() => Position.fromString('c4')).toThrow(/Invalid position string/);
  });

  test('rejects light squares after parsing valid-looking notation', () => {
    expect(() => Position.fromString('A1')).toThrow(/Invalid coordinates/);
  });
});
