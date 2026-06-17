import { Board } from '../src/Board.js';
import { Position } from '../src/Position.js';
import { PieceColor, PieceType, type PieceInfo } from '../src/Piece.js';

function piecesFromFirstPositions(count: number): Map<Position, PieceInfo> {
  return new Map(
    Position.allValid().slice(0, count).map<[Position, PieceInfo]>(pos => [
      pos,
      { color: PieceColor.WHITE, type: PieceType.PION },
    ]),
  );
}

function encodedWithOccupiedSquares(count: number): bigint {
  let occBits = 0;
  for (let i = 0; i < count; i++) {
    occBits |= (1 << i);
  }
  return BigInt(occBits >>> 0) << 32n;
}

describe('Board - immutability', () => {
  test('movePiece returns a new board without changing the original', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(0, 1);
    const board = Board.fromPieces(new Map<Position, PieceInfo>([
      [from, { color: PieceColor.WHITE, type: PieceType.PION }],
    ]));
    const before = board.encode();

    const moved = board.movePiece(from, to);

    expect(Object.isFrozen(board)).toBe(true);
    expect(board.encode()).toBe(before);
    expect(board.isOccupied(from)).toBe(true);
    expect(board.isOccupied(to)).toBe(false);
    expect(moved.isOccupied(from)).toBe(false);
    expect(moved.isOccupied(to)).toBe(true);
  });

  test('removePiece and promotePiece return new boards', () => {
    const pos = Position.fromCoords(1, 2);
    const board = Board.fromPieces(new Map<Position, PieceInfo>([
      [pos, { color: PieceColor.WHITE, type: PieceType.PION }],
    ]));

    const removed = board.removePiece(pos);
    const promoted = board.promotePiece(pos);

    expect(board.isOccupied(pos)).toBe(true);
    expect(board.isDamePiece(pos)).toBe(false);
    expect(removed.isOccupied(pos)).toBe(false);
    expect(promoted.isOccupied(pos)).toBe(true);
    expect(promoted.isDamePiece(pos)).toBe(true);
  });
});

describe('Board - piece count invariant', () => {
  test('fromPieces accepts valid 16-piece Thai checkers boards', () => {
    const board = Board.fromPieces(piecesFromFirstPositions(16));

    expect(board.getPieces(PieceColor.WHITE).size).toBe(16);
  });

  test('fromPieces rejects boards with more than 16 pieces', () => {
    expect(() => Board.fromPieces(piecesFromFirstPositions(17))).toThrow(RangeError);
    expect(() => Board.fromPieces(piecesFromFirstPositions(17))).toThrow(/more than 16 pieces/);
  });

  test('decode rejects encoded boards with more than 16 occupied squares', () => {
    expect(() => Board.decode(encodedWithOccupiedSquares(17))).toThrow(RangeError);
    expect(() => Board.decode(encodedWithOccupiedSquares(17))).toThrow(/more than 16 pieces/);
  });

  test('decode rejects values outside unsigned 64-bit range', () => {
    expect(() => Board.decode(-1n)).toThrow(RangeError);
    expect(() => Board.decode(1n << 64n)).toThrow(RangeError);
  });

  test('decode rejects metadata bits without occupied squares', () => {
    expect(() => Board.decode(1n)).toThrow(/not canonical/);
    expect(() => Board.decode(1n << 16n)).toThrow(/not canonical/);
  });

  test('decode rejects metadata bits beyond occupied piece count', () => {
    const oneOccupiedSquare = 1n << 32n;
    const extraDameBit = 1n << 1n;
    const extraBlackBit = 1n << 17n;

    expect(() => Board.decode(oneOccupiedSquare | extraDameBit)).toThrow(/not canonical/);
    expect(() => Board.decode(oneOccupiedSquare | extraBlackBit)).toThrow(/not canonical/);
  });

  test('decode accepts canonical encoded boards', () => {
    const pieces = new Map<Position, PieceInfo>([
      [Position.fromString('B1'), { color: PieceColor.BLACK, type: PieceType.DAME }],
      [Position.fromString('A2'), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);

    expect(Board.decode(board.encode()).equals(board)).toBe(true);
  });
});
