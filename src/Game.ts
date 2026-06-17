// Thai Checkers game state machine

import { PieceColor } from './Piece.js';
import { Position } from './Position.js';
import { Board, type Pieces } from './Board.js';
import { Legals } from './Legals.js';
import { Explorer } from './Explorer.js';

export interface Move {
  from: Position;
  to: Position;
  captured: Position[];
}

export function pieceSymbol(isBlack: boolean, isDame: boolean): string {
  return isBlack ? (isDame ? '\u25A1' : '\u25CB') : (isDame ? '\u25A0' : '\u25CF');
}

export function boardToString(board: Board): string {
  let result = '   ';
  for (let col = 0; col < 8; col++) {
    result += String.fromCharCode('A'.charCodeAt(0) + col) + ' ';
  }
  result += '\n';

  for (let row = 0; row < 8; row++) {
    result += ` ${row + 1} `;
    for (let col = 0; col < 8; col++) {
      let symbol = ' ';
      if ((row + col) % 2 === 0) {
        symbol = '.';
      } else {
        const pos = Position.fromCoords(col, row);
        if (board.isOccupied(pos)) {
          symbol = pieceSymbol(board.isBlackPiece(pos), board.isDamePiece(pos));
        } else {
          symbol = ' ';
        }
      }
      result += symbol + ' ';
    }
    result += '\n';
  }
  return result;
}

export class Game {
  #boardHistory: Board[] = [];
  #encodedHistory: bigint[] = [];
  #indexHistory: number[] = [];

  // Caches
  #choicesDirty = true;
  #choicesCache: Move[] = [];
  #moveableDirty = true;
  #moveableCache: Map<Position, Legals> = new Map();
  #moveCountCache = 0;
  #sortedPositionsCache: Position[] = [];

  // ─── Constructors ───

  constructor(board?: Board) {
    const initial = board ?? Board.setup();
    this.#boardHistory.push(initial);
    this.#encodedHistory.push(initial.encode());
  }

  static copy(other: Game): Game {
    const g = new Game();
    g.#boardHistory = other.#boardHistory.map(b => Board.copy(b));
    g.#encodedHistory = [...other.#encodedHistory];
    g.#indexHistory = [...other.#indexHistory];
    g.#choicesDirty = true;
    g.#moveableDirty = true;
    return g;
  }

  // ─── Core actions ───

  selectMove(index: number): void {
    this.#assertValidMoveIndex(index);
    const move = this.#buildMoveAtIndex(index);
    this.#indexHistory.push(index);
    this.#executeMove(move);
  }

  undoMove(): void {
    if (this.#indexHistory.length === 0) return;
    this.#indexHistory.pop();
    this.#boardHistory.pop();
    this.#encodedHistory.pop();
    this.#choicesDirty = true;
    this.#moveableDirty = true;
  }

  // ─── Queries ───

  moveCount(): number {
    this.#updateChoicesCache();
    return this.#moveCountCache;
  }

  getMoves(): readonly Move[] {
    this.#updateChoicesCache();
    return this.#choicesCache;
  }

  getMoveSequence(): readonly number[] {
    return this.#indexHistory;
  }

  getBoardHistory(): readonly Board[] {
    return this.#boardHistory;
  }

  getEncodedHistory(): readonly bigint[] {
    return this.#encodedHistory;
  }

  board(): Board {
    return this.#boardHistory[this.#boardHistory.length - 1];
  }

  player(): PieceColor {
    return this.#indexHistory.length % 2 === 0 ? PieceColor.WHITE : PieceColor.BLACK;
  }

  // ─── Private: move execution ───

  #executeMove(move: Move): void {
    const current = this.board();

    // Move piece
    let next = current.movePiece(move.from, move.to);

    // Remove captured pieces
    for (const cap of move.captured) {
      next = next.removePiece(cap);
    }

    // Promotion check
    const movedIsBlack = current.isBlackPiece(move.from);
    const color: PieceColor = movedIsBlack ? PieceColor.BLACK : PieceColor.WHITE;
    const promoRow = color === PieceColor.WHITE ? 0 : 7;
    if (move.to.y === promoRow && !current.isDamePiece(move.from)) {
      next = next.promotePiece(move.to);
    }

    this.#boardHistory.push(next);
    this.#encodedHistory.push(next.encode());
    this.#choicesDirty = true;
    this.#moveableDirty = true;
  }

  // ─── Private: move generation ───

  #updateChoicesCache(): void {
    if (!this.#choicesDirty) return;
    this.#choicesDirty = false;

    this.#updateMoveableCache();
    this.#moveCountCache = this.#computeMoveCountFast();
    this.#choicesCache = this.#buildAllMoves();
  }

  #updateMoveableCache(): void {
    if (!this.#moveableDirty) return;
    this.#moveableDirty = false;

    this.#moveableCache.clear();
    this.#sortedPositionsCache = [];

    const board = this.board();
    const color = this.player();
    const pieces = board.getPieces(color);

    for (const [pos] of pieces) {
      const explorer = new Explorer(board);
      const legals = explorer.findValidMoves(pos);
      if (!legals.empty()) {
        this.#moveableCache.set(pos, legals);
        this.#sortedPositionsCache.push(pos);
      }
    }

    // Sort positions for deterministic ordering
    this.#sortedPositionsCache.sort((a, b) => a.compare(b));
  }

  #computeMoveCountFast(): number {
    let hasCaptures = false;
    for (const [, legals] of this.#moveableCache) {
      if (legals.hasCaptured()) { hasCaptures = true; break; }
    }
    let count = 0;
    for (const [, legals] of this.#moveableCache) {
      if (hasCaptures && !legals.hasCaptured()) continue;
      count += legals.size();
    }
    return count;
  }

  #buildAllMoves(): Move[] {
    const moves: Move[] = [];

    // Check if any capture is available globally
    let hasCaptures = false;
    for (const [, legals] of this.#moveableCache) {
      if (legals.hasCaptured()) {
        hasCaptures = true;
        break;
      }
    }

    for (const pos of this.#sortedPositionsCache) {
      const legals = this.#moveableCache.get(pos)!;

      // If captures exist anywhere, only include capture moves
      if (hasCaptures && !legals.hasCaptured()) continue;

      for (let i = 0; i < legals.size(); i++) {
        const info = legals.getMoveInfo(i);
        moves.push({
          from: pos,
          to: info.targetPosition,
          captured: [...info.capturedPositions],
        });
      }
    }

    return moves;
  }

  #assertValidMoveIndex(index: number): void {
    if (!Number.isInteger(index)) {
      throw new RangeError(`Move index must be an integer: ${index}`);
    }

    const count = this.moveCount();
    if (index < 0 || index >= count) {
      const range = count > 0 ? `0-${count - 1}` : 'no legal moves';
      throw new RangeError(`Move index ${index} out of range; valid range is ${range}`);
    }
  }

  #buildMoveAtIndex(index: number): Move {
    this.#updateMoveableCache();

    let hasCaptures = false;
    for (const [, legals] of this.#moveableCache) {
      if (legals.hasCaptured()) {
        hasCaptures = true;
        break;
      }
    }

    let cumulative = 0;
    for (const pos of this.#sortedPositionsCache) {
      const legals = this.#moveableCache.get(pos)!;

      if (hasCaptures && !legals.hasCaptured()) continue;

      const size = legals.size();
      if (index < cumulative + size) {
        const info = legals.getMoveInfo(index - cumulative);
        return {
          from: pos,
          to: info.targetPosition,
          captured: [...info.capturedPositions],
        };
      }
      cumulative += size;
    }

    throw new RangeError(`Move index ${index} out of range`);
  }

  // ─── Debug ───

  printBoard(): void {
    console.log(boardToString(this.board()));
  }

  printChoices(): void {
    const moves = this.getMoves();
    console.log(`Moves (${moves.length}):`);
    for (const m of moves) {
      const capStr = m.captured.length > 0 ? ` captures ${m.captured.map(c => c.toString()).join(',')}` : '';
      console.log(`  ${m.from.toString()} -> ${m.to.toString()}${capStr}`);
    }
  }
}
