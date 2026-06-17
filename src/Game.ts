// Thai Checkers game state machine

import { PieceColor, pieceSymbol } from './Piece.js';
import { Position } from './Position.js';
import { Board } from './Board.js';
import { Legals, type MoveInfo } from './Legals.js';
import { Explorer } from './Explorer.js';

export interface Move {
  from: Position;
  to: Position;
  captured: Position[];
}

function copyMove(move: Move): Move {
  return {
    from: move.from,
    to: move.to,
    captured: [...move.captured],
  };
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
    return this.#choicesCache.map(copyMove);
  }

  getMoveSequence(): readonly number[] {
    return [...this.#indexHistory];
  }

  getBoardHistory(): readonly Board[] {
    return [...this.#boardHistory];
  }

  getEncodedHistory(): readonly bigint[] {
    return [...this.#encodedHistory];
  }

  board(): Board {
    return this.#boardHistory.at(-1)!;
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

    for (const [index] of pieces) {
      const pos = Position.fromIndex(index);
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

  #hasMandatoryCapture(): boolean {
    for (const legals of this.#moveableCache.values()) {
      if (legals.hasCaptured()) return true;
    }
    return false;
  }

  #toMove(from: Position, info: MoveInfo): Move {
    return { from, to: info.targetPosition, captured: [...info.capturedPositions] };
  }

  #computeMoveCountFast(): number {
    const hasCaptures = this.#hasMandatoryCapture();
    let count = 0;
    for (const legals of this.#moveableCache.values()) {
      if (hasCaptures && !legals.hasCaptured()) continue;
      count += legals.size();
    }
    return count;
  }

  #buildAllMoves(): Move[] {
    const moves: Move[] = [];
    const hasCaptures = this.#hasMandatoryCapture();

    for (const pos of this.#sortedPositionsCache) {
      const legals = this.#moveableCache.get(pos)!;

      // If captures exist anywhere, only include capture moves
      if (hasCaptures && !legals.hasCaptured()) continue;

      for (let i = 0; i < legals.size(); i++) {
        moves.push(this.#toMove(pos, legals.getMoveInfo(i)));
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
    const hasCaptures = this.#hasMandatoryCapture();

    let cumulative = 0;
    for (const pos of this.#sortedPositionsCache) {
      const legals = this.#moveableCache.get(pos)!;

      if (hasCaptures && !legals.hasCaptured()) continue;

      const size = legals.size();
      if (index < cumulative + size) {
        return this.#toMove(pos, legals.getMoveInfo(index - cumulative));
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
