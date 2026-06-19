import { Board, Game } from '../../src/index.js';
import { formatMove, renderGame } from '../../src/app/render.js';

describe('formatMove', () => {
  test('renders a plain move', () => {
    const game = new Game();
    const move = game.getMoves()[0];
    expect(formatMove(move)).toMatch(/^[A-H][1-8] -> [A-H][1-8]$/);
  });
});

describe('renderGame', () => {
  test('shows the board, status line and a numbered menu at the start', () => {
    const game = new Game();
    const output = renderGame(game);

    // Board header row (columns A..H).
    expect(output).toContain('A B C D E F G H');
    // Status line: side to move and ply count.
    expect(output).toContain('WHITE to move');
    expect(output).toContain('Ply 0');
    // At least one numbered move entry.
    expect(output).toMatch(/^\s+1\) [A-H][1-8] -> [A-H][1-8]/m);
  });

  test('reports game over when the side to move has no legal moves', () => {
    // An empty board leaves WHITE (the side to move first) with nothing to do.
    const game = new Game(Board.empty());
    const output = renderGame(game);
    expect(output).toContain('Game over');
    expect(output).toContain('BLACK wins');
  });

  test('a fresh game is not game over', () => {
    expect(renderGame(new Game())).not.toContain('Game over');
  });
});
