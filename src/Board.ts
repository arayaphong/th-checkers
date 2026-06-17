// Bitboard-based 8×8 Thai Checkers board (32 playable dark squares)

import { PieceColor, PieceType, type PieceInfo } from './Piece.js';
import { Position } from './Position.js';

const BOARD_SQUARES = 32;
const MAX_PIECES = 16;

/** 1 << idx as unsigned 32-bit integer */
function bit(idx: number): number {
  return (1 << (idx & 0x1f)) >>> 0;
}

export type Pieces = Map<Position, PieceInfo>;

export class Board {
  // Bitboards — each bit i corresponds to Position.fromIndex(i)
  #occBits: number = 0;
  #blackBits: number = 0;
  #dameBits: number = 0;

  private constructor() {}

  // ─── Factories ───

  static empty(): Board {
    return new Board();
  }

  static setup(): Board {
    const b = new Board();
    // Black pieces on rows 0, 1
    for (let row = 0; row < 2; row++) {
      const startCol = row % 2 === 0 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        const col = startCol + i * 2;
        const pos = Position.fromCoords(col, row);
        const mask = bit(pos.hash());
        b.#occBits |= mask;
        b.#blackBits |= mask;
      }
    }
    // White pieces on rows 6, 7
    for (let row = 6; row < 8; row++) {
      const startCol = row % 2 === 0 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        const col = startCol + i * 2;
        const pos = Position.fromCoords(col, row);
        const mask = bit(pos.hash());
        b.#occBits |= mask;
        // blackBits already 0, dameBits already 0
      }
    }
    return b;
  }

  static fromPieces(pieces: Pieces): Board {
    const b = new Board();
    for (const [pos, info] of pieces) {
      const mask = bit(pos.hash());
      b.#occBits |= mask;
      if (info.color === PieceColor.BLACK) {
        b.#blackBits |= mask;
      } else {
        b.#blackBits &= ~mask;
      }
      if (info.type === PieceType.DAME) {
        b.#dameBits |= mask;
      } else {
        b.#dameBits &= ~mask;
      }
    }
    return b;
  }

  static copy(other: Board): Board {
    const b = new Board();
    b.#occBits = other.#occBits >>> 0;
    b.#blackBits = other.#blackBits >>> 0;
    b.#dameBits = other.#dameBits >>> 0;
    return b;
  }

  static decode(encoded: bigint): Board {
    const b = new Board();
    b.#occBits = Number((encoded >> 32n) & 0xffffffffn) >>> 0;

    const low32 = Number(encoded & 0xffffffffn) >>> 0;
    let count = 0;
    for (let i = 0; i < BOARD_SQUARES && count < MAX_PIECES; i++) {
      const mask = bit(i);
      if ((b.#occBits & mask) === 0) continue;
      if ((low32 & (1 << count)) !== 0) b.#dameBits |= mask;
      if ((low32 & (1 << (count + MAX_PIECES))) !== 0) b.#blackBits |= mask;
      count++;
    }
    return b;
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
    const out: Pieces = new Map();
    for (let i = 0; i < BOARD_SQUARES; i++) {
      const mask = bit(i);
      if ((this.#occBits & mask) === 0) continue;
      const isBlack = (this.#blackBits & mask) !== 0;
      if ((color === PieceColor.BLACK) !== isBlack) continue;
      const isDame = (this.#dameBits & mask) !== 0;
      out.set(Position.fromIndex(i), {
        color: isBlack ? PieceColor.BLACK : PieceColor.WHITE,
        type: isDame ? PieceType.DAME : PieceType.PION,
      });
    }
    return out;
  }

  // ─── Mutations ───

  promotePiece(pos: Position): void {
    const mask = bit(pos.hash());
    if ((this.#occBits & mask) === 0) return;
    this.#dameBits |= mask;
  }

  movePiece(from: Position, to: Position): void {
    const fm = bit(from.hash());
    const tm = bit(to.hash());
    if ((this.#occBits & fm) === 0) return;
    if ((this.#occBits & tm) !== 0) return;

    const wasBlack = (this.#blackBits & fm) !== 0;
    const wasDame = (this.#dameBits & fm) !== 0;

    this.#occBits &= ~fm;
    this.#blackBits &= ~fm;
    this.#dameBits &= ~fm;

    this.#occBits |= tm;
    if (wasBlack) this.#blackBits |= tm;
    if (wasDame) this.#dameBits |= tm;
  }

  removePiece(pos: Position): void {
    const mask = bit(pos.hash());
    this.#occBits &= ~mask;
    this.#blackBits &= ~mask;
    this.#dameBits &= ~mask;
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
