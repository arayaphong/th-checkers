// Rendering for the REPL. Composes the board grid, a status line and the
// numbered legal-move menu into a single printable string. Kept pure (Game in,
// string out) so it is easy to unit-test and the Repl stays thin.

import { boardToString, PieceColor, toStringPieceColor, type Game, type Move } from '../index.js';

/** Format one move as it appears in the numbered menu, e.g. "C3 -> D4 ×E5 →D4 ×G7" for captures. */
export function formatMove(move: Move): string {
  const captures = move.trace
    ? ` ${move.trace.toString()}`
    : move.captured.length > 0
      ? ` [x ${move.captured.map(c => c.toString()).join(',')}]`
      : '';
  return `${move.from.toString()} -> ${move.to.toString()}${captures}`;
}

/** Render the full display: board, status line and numbered move menu (or game-over). */
export function renderGame(game: Game): string {
  const moves = game.getMoves();
  const ply = game.getMoveSequence().length;
  const lines: string[] = [];

  lines.push(boardToString(game.board()).trimEnd());
  lines.push('');

  if (moves.length === 0) {
    const winner = game.player() === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    lines.push(`Game over — ${toStringPieceColor(winner)} wins (no moves for ${toStringPieceColor(game.player())}).`);
    return lines.join('\n');
  }

  lines.push(`Ply ${ply} — ${toStringPieceColor(game.player())} to move. ${moves.length} legal move(s):`);
  moves.forEach((move, i) => {
    lines.push(`  ${i + 1}) ${formatMove(move)}`);
  });

  return lines.join('\n');
}
