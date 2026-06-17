// Thai Checkers piece definitions

export const PieceColor = { WHITE: 0, BLACK: 1 } as const;
export type PieceColor = typeof PieceColor[keyof typeof PieceColor];

export const PieceType = { PION: 0, DAME: 1 } as const;
export type PieceType = typeof PieceType[keyof typeof PieceType];

export interface PieceInfo {
  color: PieceColor;
  type: PieceType;
}

export function isPieceColor(color: unknown): color is PieceColor {
  return color === PieceColor.WHITE || color === PieceColor.BLACK;
}

export function isPieceType(type: unknown): type is PieceType {
  return type === PieceType.PION || type === PieceType.DAME;
}

export function assertPieceColor(color: unknown): asserts color is PieceColor {
  if (!isPieceColor(color)) {
    throw new RangeError(`Invalid piece color: ${String(color)}`);
  }
}

export function assertPieceType(type: unknown): asserts type is PieceType {
  if (!isPieceType(type)) {
    throw new RangeError(`Invalid piece type: ${String(type)}`);
  }
}

export function assertPieceInfo(info: unknown): asserts info is PieceInfo {
  if (typeof info !== 'object' || info === null) {
    throw new TypeError('Piece info must be an object');
  }
  assertPieceColor((info as Partial<PieceInfo>).color);
  assertPieceType((info as Partial<PieceInfo>).type);
}

export function pieceSymbol(isBlack: boolean, isDame: boolean): string {
  return isBlack ? (isDame ? '\u25A1' : '\u25CB') : (isDame ? '\u25A0' : '\u25CF');
}

export function toStringPieceColor(color: PieceColor): string {
  assertPieceColor(color);
  return color === PieceColor.WHITE ? 'WHITE' : 'BLACK';
}

export function toStringPieceType(type: PieceType): string {
  assertPieceType(type);
  return type === PieceType.PION ? 'PION' : 'DAME';
}
