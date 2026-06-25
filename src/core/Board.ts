// Bitboard-based 8×8 Thai Checkers board (32 playable dark squares)

import {
  PieceColor,
  PieceType,
  assertPieceColor,
  assertPieceInfo,
  type PieceInfo,
} from './Piece.js';
import { Position } from './Position.js';

const BOARD_SQUARES = 32;
const MAX_PIECES = 16;
const MAX_ENCODED = (1n << 64n) - 1n;

/** 1 << idx as unsigned 32-bit integer. `idx` must be a board square index (0..31). */
function bit(idx: number): number {
  if (idx < 0 || idx >= BOARD_SQUARES) {
    throw new RangeError(`Bit index out of range: ${idx}`);
  }
  return (1 << idx) >>> 0;
}

function popCount32(value: number): number {
  let bits = value >>> 0;
  let count = 0;
  while (bits !== 0) {
    bits &= bits - 1;
    count++;
  }
  return count;
}

function assertValidPieceCount(count: number): void {
  if (count > MAX_PIECES) {
    throw new RangeError(`Thai checkers boards cannot contain more than ${MAX_PIECES} pieces`);
  }
}

export type PieceKey = number;
export type PiecePosition = Position | PieceKey;
export type PieceEntries = Iterable<readonly [PiecePosition, PieceInfo]>;
export type Pieces = Map<PieceKey, PieceInfo>;

function toPieceKey(position: PiecePosition): PieceKey {
  if (position instanceof Position) {
    return position.hash();
  }
  // Validate the raw index — throws if out of range, result is intentionally discarded.
  Position.fromIndex(position);
  return position;
}

export class Board {
  // Bitboards — each bit i corresponds to Position.fromIndex(i)
  readonly #occBits: number;
  readonly #blackBits: number;
  readonly #dameBits: number;

  private constructor(occBits = 0, blackBits = 0, dameBits = 0) {
    this.#occBits = occBits >>> 0;
    this.#blackBits = blackBits >>> 0;
    this.#dameBits = dameBits >>> 0;
    Object.freeze(this);
  }

  // ─── Factories ───

  static empty(): Board {
    return new Board();
  }

  static setup(): Board {
    let occBits = 0;
    let blackBits = 0;
    // Black home rows are 0-1, white home rows are 6-7 (white stays unset in blackBits)
    for (const row of [0, 1, 6, 7]) {
      const startCol = row % 2 === 0 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        const mask = bit(Position.fromCoords(startCol + i * 2, row).hash());
        occBits |= mask;
        if (row < 2) blackBits |= mask;
      }
    }
    return new Board(occBits, blackBits, 0);
  }

  static fromPieces(pieces: PieceEntries): Board {
    let occBits = 0;
    let blackBits = 0;
    let dameBits = 0;
    const seen = new Set<PieceKey>();
    for (const [position, info] of pieces) {
      const key = toPieceKey(position);
      if (seen.has(key)) {
        throw new Error(`Duplicate piece position: ${Position.fromIndex(key).toString()}`);
      }
      seen.add(key);
      assertPieceInfo(info);
      const mask = bit(key);
      occBits |= mask;
      if (info.color === PieceColor.BLACK) {
        blackBits |= mask;
      } else {
        blackBits &= ~mask;
      }
      if (info.type === PieceType.DAME) {
        dameBits |= mask;
      } else {
        dameBits &= ~mask;
      }
    }
    assertValidPieceCount(popCount32(occBits));
    return new Board(occBits, blackBits, dameBits);
  }

  static copy(other: Board): Board {
    return new Board(other.#occBits, other.#blackBits, other.#dameBits);
  }

  static decode(encoded: bigint): Board {
    if (encoded < 0n || encoded > MAX_ENCODED) {
      throw new RangeError('Encoded board must be an unsigned 64-bit value');
    }

    const occBits = Number((encoded >> 32n) & 0xffffffffn) >>> 0;
    assertValidPieceCount(popCount32(occBits));

    let blackBits = 0;
    let dameBits = 0;

    const low32 = Number(encoded & 0xffffffffn) >>> 0;
    let count = 0;
    for (let i = 0; i < BOARD_SQUARES && count < MAX_PIECES; i++) {
      const mask = bit(i);
      if ((occBits & mask) === 0) continue;
      if ((low32 & (1 << count)) !== 0) dameBits |= mask;
      if ((low32 & (1 << (count + MAX_PIECES))) !== 0) blackBits |= mask;
      count++;
    }

    const board = new Board(occBits, blackBits, dameBits);
    if (board.encode() !== encoded) {
      throw new Error('Encoded board is not canonical');
    }
    return board;
  }

  // ─── Queries ───

  static isValidPosition(pos: Position): boolean {
    return Position.isValid(pos.x, pos.y);
  }

  isOccupied(pos: Position): boolean {
    if (!Board.isValidPosition(pos)) return false;
    return (this.#occBits & bit(pos.hash())) !== 0;
  }

  isBlackPiece(pos: Position): boolean {
    return (this.#blackBits & bit(pos.hash())) !== 0;
  }

  isDamePiece(pos: Position): boolean {
    return (this.#dameBits & bit(pos.hash())) !== 0;
  }

  getPieces(color: PieceColor): Pieces {
    assertPieceColor(color);
    const out: Pieces = new Map();
    for (let i = 0; i < BOARD_SQUARES; i++) {
      const mask = bit(i);
      if ((this.#occBits & mask) === 0) continue;
      const isBlack = (this.#blackBits & mask) !== 0;
      if ((color === PieceColor.BLACK) !== isBlack) continue;
      const isDame = (this.#dameBits & mask) !== 0;
      out.set(i, {
        color: isBlack ? PieceColor.BLACK : PieceColor.WHITE,
        type: isDame ? PieceType.DAME : PieceType.PION,
      });
    }
    return out;
  }

  // ─── Transformations ───

  promotePiece(pos: Position): Board {
    const mask = bit(pos.hash());
    if ((this.#occBits & mask) === 0) {
      throw new Error(`Cannot promote: no piece at ${pos.toString()}`);
    }
    if ((this.#dameBits & mask) !== 0) {
      throw new Error(`Cannot promote: piece at ${pos.toString()} is already a dame`);
    }
    return new Board(this.#occBits, this.#blackBits, this.#dameBits | mask);
  }

  movePiece(from: Position, to: Position): Board {
    const fm = bit(from.hash());
    const tm = bit(to.hash());
    if ((this.#occBits & fm) === 0) {
      throw new Error(`Cannot move: no piece at ${from.toString()}`);
    }
    // Loop-capture: piece returns to its origin square — no bitboard change needed.
    if (from.equals(to)) {
      return this;
    }
    if ((this.#occBits & tm) !== 0) {
      throw new Error(`Cannot move: destination ${to.toString()} is occupied`);
    }

    const wasBlack = (this.#blackBits & fm) !== 0;
    const wasDame = (this.#dameBits & fm) !== 0;

    const occBits = (this.#occBits & ~fm) | tm;
    let blackBits = this.#blackBits & ~fm;
    let dameBits = this.#dameBits & ~fm;

    if (wasBlack) blackBits |= tm;
    if (wasDame) dameBits |= tm;

    return new Board(occBits, blackBits, dameBits);
  }

  removePiece(pos: Position): Board {
    const mask = bit(pos.hash());
    if ((this.#occBits & mask) === 0) {
      throw new Error(`Cannot remove: no piece at ${pos.toString()}`);
    }
    return new Board(
      this.#occBits & ~mask,
      this.#blackBits & ~mask,
      this.#dameBits & ~mask,
    );
  }

  // ─── Encoding ───

  encode(): bigint {
    let damePacked = 0;
    let blackPacked = 0;
    let count = 0;
    for (let i = 0; i < BOARD_SQUARES; i++) {
      const mask = bit(i);
      if ((this.#occBits & mask) === 0) continue;
      if ((this.#dameBits & mask) !== 0) damePacked |= (1 << count);
      if ((this.#blackBits & mask) !== 0) blackPacked |= (1 << count);
      count++;
    }
    return (BigInt(this.#occBits >>> 0) << 32n)
         | (BigInt(blackPacked & 0xffff) << 16n)
         | BigInt(damePacked & 0xffff);
  }

  // ─── Accessors ───

  get occBits(): number { return this.#occBits >>> 0; }
  get blackBits(): number { return this.#blackBits >>> 0; }
  get dameBits(): number { return this.#dameBits >>> 0; }

  // ─── Equality ───

  equals(other: Board): boolean {
    return this.#occBits === other.#occBits &&
           this.#blackBits === other.#blackBits &&
           this.#dameBits === other.#dameBits;
  }

  hashCode(): number {
    return (this.#occBits ^ this.#blackBits ^ this.#dameBits) >>> 0;
  }
}
