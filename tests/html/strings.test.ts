import { Game, PieceColor, PieceType } from '../../dist/index.js';
// @ts-expect-error - browser util is plain JavaScript
import { htmlToPos, posToHtml, isDarkSquare, BOARD_SIZE } from '../../html/js/util/coords.js';
import {
  playerLabel,
  pieceTypeLabel,
  squareLabel,
  capturedSummary,
  // @ts-expect-error - browser util is plain JavaScript
} from '../../html/js/util/strings.th.js';

describe('strings.th', () => {
  test('playerLabel names each side', () => {
    expect(playerLabel(PieceColor.WHITE)).toBe('ผู้เล่น 1');
    expect(playerLabel(PieceColor.BLACK)).toBe('ผู้เล่น 2');
  });

  test('pieceTypeLabel distinguishes dame from pion', () => {
    expect(pieceTypeLabel(true)).toBe('ฮอส');
    expect(pieceTypeLabel(false)).toBe('หมากธรรมดา');
  });

  test('squareLabel marks a light square as unplayable', () => {
    const label = squareLabel({
      r: 0,
      c: 0,
      dark: false,
      board: new Game().board(),
      pos: null,
      hasLegalMove: false,
      selectedSquare: null,
      validMoves: [],
      currentPlayer: PieceColor.WHITE,
    });
    expect(label).toBe('A1: ช่องที่เดินไม่ได้');
  });

  test('squareLabel describes a movable piece without the no-moves note', () => {
    const game = new Game();
    const from = game.getMoves()[0].from;
    const { r, c } = posToHtml(from);
    const label = squareLabel({
      r,
      c,
      dark: true,
      board: game.board(),
      pos: from,
      hasLegalMove: true,
      selectedSquare: null,
      validMoves: [],
      currentPlayer: game.player(),
    });
    expect(label).toContain(playerLabel(game.player()));
    expect(label).not.toContain('ไม่มีตาเดินที่ถูกต้อง');
  });

  test('squareLabel reports empty, selected, and legal-target state', () => {
    const board = new Game().board();
    let empty: { r: number; c: number; pos: ReturnType<typeof htmlToPos> } | null = null;
    for (let r = 0; r < BOARD_SIZE && !empty; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!isDarkSquare(r, c)) continue;
        const pos = htmlToPos(r, c);
        if (!board.isOccupied(pos)) {
          empty = { r, c, pos };
          break;
        }
      }
    }
    expect(empty).not.toBeNull();
    const { r, c, pos } = empty!;
    const label = squareLabel({
      r,
      c,
      dark: true,
      board,
      pos,
      hasLegalMove: false,
      selectedSquare: { r, c },
      validMoves: [{ r, c }],
      currentPlayer: PieceColor.WHITE,
    });
    expect(label).toContain('ช่องว่าง');
    expect(label).toContain('เลือกอยู่');
    expect(label).toContain('เดินมาช่องนี้ได้');
  });

  test('capturedSummary covers none, single type, and mixed types', () => {
    expect(capturedSummary('ผู้เล่น 1', [])).toBe('ผู้เล่น 1 ยังไม่ได้กินหมาก');
    expect(
      capturedSummary('ผู้เล่น 1', [{ color: PieceColor.BLACK, type: PieceType.PION }]),
    ).toBe('ผู้เล่น 1 กินหมากของผู้เล่น 2: หมากธรรมดา 1 ตัว');
    expect(
      capturedSummary('ผู้เล่น 2', [
        { color: PieceColor.WHITE, type: PieceType.PION },
        { color: PieceColor.WHITE, type: PieceType.DAME },
      ]),
    ).toBe('ผู้เล่น 2 กินหมากของผู้เล่น 1: หมากธรรมดา 1 ตัว และ ฮอส 1 ตัว');
  });
});
