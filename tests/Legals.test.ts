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

describe('Legals - immutability', () => {
  test('getCapturePieces returns a defensive copy', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    const captured = legals.getCapturePieces(0);
    captured.push(Position.fromString('D3'));

    expect(legals.getCapturePieces(0)).toHaveLength(1);
    expect(legals.getCapturePieces(0)[0].equals(Position.fromString('B3'))).toBe(true);
  });

  test('getMoveInfo returns a defensive copy', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    const move = legals.getMoveInfo(0);
    move.capturedPositions.push(Position.fromString('D3'));

    expect(legals.getMoveInfo(0).capturedPositions).toHaveLength(1);
  });

  test('iterator yields defensive copies', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);
    const [move] = [...legals];

    move.capturedPositions.push(Position.fromString('D3'));

    expect(legals.getMoveInfo(0).capturedPositions).toHaveLength(1);
  });
});

describe('Legals - capture sequence validation', () => {
  test('rejects empty capture sequence', () => {
    expect(() => new Legals([[]])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects single-position capture sequence', () => {
    expect(() => new Legals([
      [Position.fromString('B3')],
    ])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects odd-length capture sequence', () => {
    expect(() => new Legals([
      [Position.fromString('B3'), Position.fromString('A2'), Position.fromString('D3')],
    ])).toThrow(/captured\/landing position pairs/);
  });

  test('accepts captured and landing pairs', () => {
    const legals = new Legals([
      [
        Position.fromString('B3'),
        Position.fromString('A2'),
        Position.fromString('D3'),
        Position.fromString('E4'),
      ],
    ]);

    expect(legals.getPosition(0).equals(Position.fromString('E4'))).toBe(true);
    expect(legals.getCapturePieces(0).map(pos => pos.toString())).toEqual(['B3', 'D3']);
  });
});

describe('Legals - runtime position validation', () => {
  test('rejects non-Position regular moves', () => {
    const positions = [{}] as unknown as Position[];

    expect(() => new Legals(positions)).toThrow(TypeError);
    expect(() => new Legals(positions)).toThrow(/Regular move 0 must be a Position/);
  });

  test('rejects mixed regular move inputs', () => {
    const positions = [
      Position.fromString('B1'),
      [Position.fromString('B3'), Position.fromString('A2')],
    ] as unknown as Position[];

    expect(() => new Legals(positions)).toThrow(TypeError);
    expect(() => new Legals(positions)).toThrow(/Regular move 1 must be a Position/);
  });

  test('rejects non-Position captured entries', () => {
    const sequences = [
      [{} as unknown as Position, Position.fromString('A2')],
    ];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture sequence item 0 must be a Position/);
  });

  test('rejects non-Position landing entries', () => {
    const sequences = [
      [Position.fromString('B3'), {} as unknown as Position],
    ];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture sequence item 1 must be a Position/);
  });

  test('rejects mixed capture move inputs', () => {
    const sequences = [
      [Position.fromString('B3'), Position.fromString('A2')],
      Position.fromString('C4'),
    ] as unknown as Position[][];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture move 1 must be a capture sequence/);
  });
});
