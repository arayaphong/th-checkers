// Thai user-facing copy. Centralizing it keeps presentation text in one place
// (SRP) and makes adding another locale an additive change (OCP).
// Every builder here is pure: all state arrives through arguments.
import { PieceColor, PieceType } from '../../../dist/index.js';
import { COLS, colorAt } from './coords.js';

export function playerLabel(color) {
  return color === PieceColor.WHITE ? 'ผู้เล่น 1' : 'ผู้เล่น 2';
}

export function pieceTypeLabel(isDame) {
  return isDame ? 'ฮอส' : 'หมากธรรมดา';
}

// Accessible label for a single board square.
export function squareLabel({
  r,
  c,
  dark,
  board,
  pos,
  hasLegalMove,
  selectedSquare,
  validMoves,
  currentPlayer,
}) {
  const coordinate = `${COLS[c]}${r + 1}`;
  if (!dark) return `${coordinate}: ช่องที่เดินไม่ได้`;

  const selected = selectedSquare?.r === r && selectedSquare?.c === c;
  const legalTarget = validMoves.some((move) => move.r === r && move.c === c);
  const details = [];

  if (board.isOccupied(pos)) {
    const pieceColor = colorAt(board, pos);
    details.push(`${playerLabel(pieceColor)} ${pieceTypeLabel(board.isDamePiece(pos))}`);
    if (pieceColor === currentPlayer && !hasLegalMove) {
      details.push('ไม่มีตาเดินที่ถูกต้อง');
    }
  } else {
    details.push('ช่องว่าง');
  }

  if (selected) details.push('เลือกอยู่');
  if (legalTarget) details.push('เดินมาช่องนี้ได้');
  return `${coordinate}: ${details.join(', ')}`;
}

// Accessible summary of the pieces a player has captured.
export function capturedSummary(capturer, capturedList) {
  if (capturedList.length === 0) return `${capturer} ยังไม่ได้กินหมาก`;

  const owner = capturedList[0].color === PieceColor.WHITE ? 'ผู้เล่น 1' : 'ผู้เล่น 2';
  const pionCount = capturedList.filter((piece) => piece.type === PieceType.PION).length;
  const dameCount = capturedList.filter((piece) => piece.type === PieceType.DAME).length;
  const counts = [];
  if (pionCount > 0) counts.push(`หมากธรรมดา ${pionCount} ตัว`);
  if (dameCount > 0) counts.push(`ฮอส ${dameCount} ตัว`);
  return `${capturer} กินหมากของ${owner}: ${counts.join(' และ ')}`;
}
