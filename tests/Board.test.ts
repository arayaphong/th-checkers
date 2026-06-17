import { Board } from '../src/Board.js';
import { Position } from '../src/Position.js';
import { PieceColor, PieceType, type PieceInfo } from '../src/Piece.js';

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
