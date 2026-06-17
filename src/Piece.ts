// Thai Checkers piece definitions

export enum PieceColor {
  WHITE = 0,
  BLACK = 1,
}

export enum PieceType {
  PION = 0,
  DAME = 1,
}

export interface PieceInfo {
  color: PieceColor;
  type: PieceType;
}

export function pieceSymbol(isBlack: boolean, isDame: boolean): string {
  return isBlack ? (isDame ? '\u25A1' : '\u25CB') : (isDame ? '\u25A0' : '\u25CF');
}

export function toStringPieceColor(color: PieceColor): string {
  switch (color) {
    case PieceColor.WHITE: return 'WHITE';
    case PieceColor.BLACK: return 'BLACK';
  }
}

export function toStringPieceType(type: PieceType): string {
  switch (type) {
    case PieceType.PION: return 'PION';
    case PieceType.DAME: return 'DAME';
  }
}
