// Pure coordinate + presentation-class mapping between the HTML grid and the
// engine. No DOM, no module state — trivially unit-testable.
//
// HTML grid and engine share orientation: row 0 = top = engine y = 0,
// row 7 = bottom = engine y = 7. Dark squares coincide because
// (r + c) odd <=> (x + y) odd when x = c, y = r.
import { Position, PieceColor } from '../../../dist/index.js';

export const BOARD_SIZE = 8;
export const COLS = 'ABCDEFGH';

export function htmlToPos(r, c) {
  return Position.fromCoords(c, r);
}

export function posToHtml(pos) {
  return { r: pos.y, c: pos.x };
}

export function isDarkSquare(r, c) {
  return (r + c) % 2 !== 0;
}

// CSS class for a piece/marker owned by the given color (P1 = white/red).
export function pieceColorClass(color) {
  return color === PieceColor.WHITE ? 'p1' : 'p2';
}

// Resolve the engine color of the piece occupying `pos`.
export function colorAt(board, pos) {
  return board.isBlackPiece(pos) ? PieceColor.BLACK : PieceColor.WHITE;
}
