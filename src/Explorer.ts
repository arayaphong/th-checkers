// Move generation — Thai Checkers rules

import { PieceColor, PieceType } from './Piece.js';
import { Position } from './Position.js';
import { Board } from './Board.js';
import { Legals, type CaptureSequence } from './Legals.js';

// ─── direction helpers ───

interface Delta { dx: number; dy: number; }

const WHITE_PION_DIRS: Delta[] = [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }];
const BLACK_PION_DIRS: Delta[] = [{ dx: -1, dy: 1 }, { dx: 1, dy: 1 }];
const DAME_DIRS: Delta[] = [
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },  { dx: 1, dy: 1 },
];

function getDirs(color: PieceColor, isDame: boolean): Delta[] {
  if (isDame) return DAME_DIRS;
  return color === PieceColor.BLACK ? BLACK_PION_DIRS : WHITE_PION_DIRS;
}

// ─── Explorer ───

export class Explorer {
  readonly #board: Board;

  constructor(board: Board) {
    this.#board = board;
  }

  // ─── public API ───

  findValidMoves(from: Position): Legals {
    if (!this.#board.isOccupied(from)) {
      throw new Error(`No piece at ${from.toString()}`);
    }

    const isDame = this.#board.isDamePiece(from);
    const color = this.#board.isBlackPiece(from) ? PieceColor.BLACK : PieceColor.WHITE;

    // 1. Try captures
    const captures = this.#findAllCaptureSequences(from, color, isDame);
    if (captures.length > 0) return new Legals(captures);

    // 2. Regular moves
    const dirs = getDirs(color, isDame);
    const positions = this.#findRegularMoves(from, color, isDame, dirs);
    return new Legals(positions);
  }

  // ─── capture sequence finding ───

  #findAllCaptureSequences(from: Position, color: PieceColor, isDame: boolean): CaptureSequence[] {
    const results: CaptureSequence[] = [];
    const dirs = getDirs(color, isDame);

    for (const d of dirs) {
      const caps = this.#findCapturesInDir(this.#board, from, d, isDame);
      for (const cap of caps) {
        const sim = this.#applyCapture(this.#board, from, cap[0], cap[1]);
        const becameDame = !isDame && this.#isPromoted(cap[1], color);
        const rec = this.#findCapturesFrom(
          sim, cap[1], color, isDame || becameDame, [cap],
        );
        if (rec.length > 0) results.push(...rec);
        else results.push(cap);
      }
    }

    // Deduplicate: same captured set + same landing = same sequence
    const seen = new Set<string>();
    const deduped: CaptureSequence[] = [];
    for (const seq of results) {
      const captures: Position[] = [];
      for (let i = 0; i < seq.length; i += 2) captures.push(seq[i]);
      const landing = seq.at(-1)!;
      const key = captures.map(c => c.hash()).sort((a, b) => a - b).join(',') + '|' + landing.hash();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(seq);
      }
    }
    return deduped;
  }

  #findCapturesFrom(
    board: Board, pos: Position, color: PieceColor, isDame: boolean,
    path: CaptureSequence[],
  ): CaptureSequence[] {
    const results: CaptureSequence[] = [];
    const dirs = getDirs(color, isDame);

    for (const d of dirs) {
      const caps = this.#findCapturesInDir(board, pos, d, isDame);
      for (const cap of caps) {
        const sim = this.#applyCapture(board, pos, cap[0], cap[1]);
        const becameDame = !isDame && this.#isPromoted(cap[1], color);
        const rec = this.#findCapturesFrom(
          sim, cap[1], color, isDame || becameDame, [...path, cap],
        );
        if (rec.length > 0) results.push(...rec);
        else results.push(this.#flatten(path, cap));
      }
    }

    return results;
  }

  #flatten(path: CaptureSequence[], last: CaptureSequence): CaptureSequence {
    return [...path.flatMap(s => [s[0], s[1]]), last[0], last[1]];
  }

  #applyCapture(board: Board, from: Position, captured: Position, landing: Position): Board {
    return board.removePiece(captured).movePiece(from, landing);
  }

  #isPromoted(pos: Position, color: PieceColor): boolean {
    return color === PieceColor.WHITE ? pos.y === 0 : pos.y === 7;
  }

  // ─── find all captures in one direction (dame can have multiple landings) ───

  #findCapturesInDir(board: Board, from: Position, dir: Delta, isDame: boolean): CaptureSequence[] {
    const myColor = board.isBlackPiece(from) ? PieceColor.BLACK : PieceColor.WHITE;
    const oppColor = myColor === PieceColor.BLACK ? PieceColor.WHITE : PieceColor.BLACK;
    const results: CaptureSequence[] = [];

    if (isDame) {
      let x = from.x + dir.dx;
      let y = from.y + dir.dy;
      let foundOpponent: Position | null = null;

      while (Position.isValid(x, y)) {
        const pos = Position.fromCoords(x, y);
        if (board.isOccupied(pos)) {
          const isOpp = oppColor === PieceColor.BLACK
            ? board.isBlackPiece(pos)
            : !board.isBlackPiece(pos);
          if (isOpp && !foundOpponent) {
            foundOpponent = pos;
          } else {
            break;
          }
        } else if (foundOpponent) {
          // Dame lands on first empty square immediately behind captured piece
          results.push([foundOpponent, pos]);
          break;
        }
        x += dir.dx;
        y += dir.dy;
      }
      return results;
    }

    // Pion: single square capture
    const midX = from.x + dir.dx;
    const midY = from.y + dir.dy;
    const landX = from.x + 2 * dir.dx;
    const landY = from.y + 2 * dir.dy;

    if (!Position.isValid(midX, midY) || !Position.isValid(landX, landY)) return [];

    const midPos = Position.fromCoords(midX, midY);
    const landPos = Position.fromCoords(landX, landY);

    if (!board.isOccupied(midPos) || board.isOccupied(landPos)) return [];

    const isOpp = oppColor === PieceColor.BLACK
      ? board.isBlackPiece(midPos)
      : !board.isBlackPiece(midPos);
    if (!isOpp) return [];

    return [[midPos, landPos]];
  }

  // ─── regular moves ───

  #findRegularMoves(from: Position, color: PieceColor, isDame: boolean, dirs: Delta[]): Position[] {
    const positions: Position[] = [];

    if (isDame) {
      for (const d of dirs) {
        let x = from.x + d.dx;
        let y = from.y + d.dy;
        while (Position.isValid(x, y)) {
          const pos = Position.fromCoords(x, y);
          if (this.#board.isOccupied(pos)) break;
          positions.push(pos);
          x += d.dx;
          y += d.dy;
        }
      }
    } else {
      for (const d of dirs) {
        const nx = from.x + d.dx;
        const ny = from.y + d.dy;
        if (Position.isValid(nx, ny)) {
          const pos = Position.fromCoords(nx, ny);
          if (!this.#board.isOccupied(pos)) positions.push(pos);
        }
      }
    }

    return positions;
  }
}
