// Backward-compatible Thai helpers. New code should receive an I18n instance.
import { createI18n } from '../i18n/i18n.js';

const thai = createI18n('th');

export function playerLabel(color) {
  return thai.playerLabel(color);
}

export function pieceTypeLabel(isDame) {
  return thai.pieceTypeLabel(isDame);
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
  return thai.squareLabel({
    r,
    c,
    dark,
    board,
    pos,
    hasLegalMove,
    selectedSquare,
    validMoves,
    currentPlayer,
  });
}

// Accessible summary of the pieces a player has captured.
export function capturedSummary(capturer, capturedList) {
  return thai.capturedSummary(capturer, capturedList);
}
