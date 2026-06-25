// Legal moves container — digests regular positions or capture sequences into uniform MoveInfo

import { Position } from './Position.js';

export interface MoveInfo {
  targetPosition: Position;
  capturedPositions: Position[];
  /** Landing squares the moving piece visits, excluding its starting square. */
  path: Position[];
  /** Raw alternating captured/landing sequence for capture moves. */
  captureSequence?: Position[];
}

export type CaptureSequence = Position[];

// ─── CaptureTrace ────────────────────────────────────────────────────────────

/**
 * A dedicated object that preserves the full capture trace:
 * captured pieces, intermediate landing squares, and the travel path.
 *
 * The stored sequence alternates captured and landing positions:
 * `[captured₁, landing₁, captured₂, landing₂, …, finalLanding]`.
 *
 * This is separate from `Move.captured` so the existing flat API stays
 * compatible while consumers that need the full path can access it.
 */
export class CaptureTrace {
  readonly #sequence: readonly Position[];

  constructor(sequence: readonly Position[]) {
    if (sequence.length < 2 || sequence.length % 2 !== 0) {
      throw new Error(
        `CaptureTrace requires captured/landing pairs, got ${sequence.length} element(s)`,
      );
    }
    for (let i = 0; i < sequence.length; i++) {
      assertPosition(sequence[i], `CaptureTrace sequence item ${i}`);
    }
    this.#sequence = Object.freeze([...sequence]);
  }

  /** Full raw sequence: `[captured₁, landing₁, …, finalLanding]`. */
  get sequence(): readonly Position[] {
    return this.#sequence;
  }

  /** Just the captured pieces (even indices). */
  get captured(): Position[] {
    const result: Position[] = [];
    for (let i = 0; i < this.#sequence.length; i += 2) {
      result.push(this.#sequence[i]);
    }
    return result;
  }

  /** The capturing piece's travel path:
   *  `[from, landing₁, landing₂, …, finalLanding]`. */
  path(from: Position): Position[] {
    const result = [from];
    for (let i = 1; i < this.#sequence.length; i += 2) {
      result.push(this.#sequence[i]);
    }
    return result;
  }

  /** Number of captures in this trace. */
  get length(): number {
    return this.#sequence.length / 2;
  }

  /** Final landing position (last element of the sequence). */
  get finalLanding(): Position {
    return this.#sequence[this.#sequence.length - 1];
  }

  toString(): string {
    const parts: string[] = [];
    for (let i = 0; i < this.#sequence.length; i += 2) {
      parts.push(`×${this.#sequence[i].toString()}`);
      if (i + 1 < this.#sequence.length) {
        parts.push(`→${this.#sequence[i + 1].toString()}`);
      }
    }
    return parts.join(' ');
  }
}

function assertValidIndex(method: string, index: number, length: number): void {
  if (!Number.isInteger(index)) {
    throw new RangeError(`${method}: index must be an integer`);
  }
  if (index < 0 || index >= length) {
    throw new RangeError(`${method}: index out of range`);
  }
}

function copyMoveInfo(move: MoveInfo): MoveInfo {
  const copy: MoveInfo = {
    targetPosition: move.targetPosition,
    capturedPositions: [...move.capturedPositions],
    path: [...move.path],
  };
  if (move.captureSequence) {
    copy.captureSequence = [...move.captureSequence];
  }
  return copy;
}

function assertPosition(value: unknown, context: string): asserts value is Position {
  if (!(value instanceof Position)) {
    throw new TypeError(`${context} must be a Position`);
  }
}

function assertValidCaptureSequence(seq: readonly unknown[]): asserts seq is readonly Position[] {
  if (seq.length === 0 || seq.length % 2 !== 0) {
    throw new Error('Capture sequence must contain captured/landing position pairs');
  }
  for (let i = 0; i < seq.length; i++) {
    assertPosition(seq[i], `Capture sequence item ${i}`);
  }
}

function processCaptureSequence(seq: readonly unknown[]): MoveInfo {
  assertValidCaptureSequence(seq);
  const typed = seq as readonly Position[];
  // Even indices = captured pieces, odd indices = landing positions
  const captured: Position[] = [];
  const path: Position[] = [];
  for (let i = 0; i < typed.length; i += 2) {
    captured.push(typed[i]);
    path.push(typed[i + 1]);
  }
  return {
    targetPosition: typed.at(-1) as Position, // last element = final landing
    capturedPositions: captured,
    path,
    captureSequence: [...typed],
  };
}

export class Legals {
  readonly #moves: MoveInfo[];
  readonly #hasCaptures: boolean;

  // From regular positions
  constructor(positions: readonly Position[]);
  // From capture sequences
  constructor(sequences: readonly CaptureSequence[]);
  // Implementation
  constructor(items: readonly (Position | CaptureSequence)[]) {
    if (items.length === 0) {
      this.#moves = [];
      this.#hasCaptures = false;
      return;
    }
    // Type detection: first item is Position or array
    if (Array.isArray(items[0])) {
      this.#hasCaptures = true;
      this.#moves = items.map((item, index) => {
        if (!Array.isArray(item)) {
          throw new TypeError(`Capture move ${index} must be a capture sequence`);
        }
        return processCaptureSequence(item);
      });
    } else {
      this.#hasCaptures = false;
      this.#moves = items.map((item, index) => {
        assertPosition(item, `Regular move ${index}`);
        return {
          targetPosition: item,
          capturedPositions: [],
          path: [item],
        };
      });
    }
  }

  hasCaptured(): boolean {
    return this.#hasCaptures;
  }

  size(): number {
    return this.#moves.length;
  }

  empty(): boolean {
    return this.#moves.length === 0;
  }

  getPosition(index: number): Position {
    assertValidIndex('Legals.getPosition', index, this.#moves.length);
    return this.#moves[index].targetPosition;
  }

  getCapturePieces(index: number): Position[] {
    if (!this.#hasCaptures) {
      throw new Error('Legals.getCapturePieces: not a capture variant');
    }
    assertValidIndex('Legals.getCapturePieces', index, this.#moves.length);
    return [...this.#moves[index].capturedPositions];
  }

  getMoveInfo(index: number): MoveInfo {
    assertValidIndex('Legals.getMoveInfo', index, this.#moves.length);
    return copyMoveInfo(this.#moves[index]);
  }

  [Symbol.iterator](): Iterator<MoveInfo> {
    return this.#moves.map(copyMoveInfo)[Symbol.iterator]();
  }
}
