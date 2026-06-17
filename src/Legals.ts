// Legal moves container — digests regular positions or capture sequences into uniform MoveInfo

import { Position } from './Position.js';

export interface MoveInfo {
  targetPosition: Position;
  capturedPositions: Position[];
}

export type CaptureSequence = Position[];

function assertValidIndex(method: string, index: number, length: number): void {
  if (!Number.isInteger(index)) {
    throw new RangeError(`${method}: index must be an integer`);
  }
  if (index < 0 || index >= length) {
    throw new RangeError(`${method}: index out of range`);
  }
}

function copyMoveInfo(move: MoveInfo): MoveInfo {
  return {
    targetPosition: move.targetPosition,
    capturedPositions: [...move.capturedPositions],
  };
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
  // Even indices = captured pieces, odd indices = landing positions
  const captured: Position[] = [];
  for (let i = 0; i < seq.length; i += 2) {
    captured.push(seq[i]);
  }
  return {
    targetPosition: seq[seq.length - 1], // last element = final landing
    capturedPositions: captured,
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
