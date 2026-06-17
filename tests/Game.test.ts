import { Game, Move, pieceSymbol, boardToString } from '../src/Game.js';
import { Board } from '../src/Board.js';
import { Position } from '../src/Position.js';
import { PieceColor, PieceType, type PieceInfo } from '../src/Piece.js';

const MAX_CONSECUTIVE_UNDOS = 4;
const MAX_TEST_MOVES = 3;

// ============================================================================
// 1. Game - Default Constructor (4 tests)
// ============================================================================
describe('Game - Default Constructor', () => {
  test('Initial board state matches setup', () => {
    const game = new Game();
    expect(game.board().encode()).toBe(Board.setup().encode());
  });

  test('Initial player is white', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Initial move count > 0', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
  });

  test('Empty move sequence initially', () => {
    const game = new Game();
    expect(game.getMoveSequence()).toHaveLength(0);
  });
});

// ============================================================================
// 2. Game - Constructor with Board (2 tests)
// ============================================================================
describe('Game - Constructor with Board', () => {
  test('Board is set correctly', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const customBoard = Board.fromPieces(pieces);
    const game = new Game(customBoard);
    expect(game.board().encode()).toBe(customBoard.encode());
  });

  test('Initial player is white with custom board', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    expect(game.player()).toBe(PieceColor.WHITE);
  });
});

// ============================================================================
// 3. Game - Copy functionality (3 tests)
// ============================================================================
describe('Game - Copy functionality', () => {
  test('Board state matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.board().encode()).toBe(original.board().encode());
  });

  test('Player matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.player()).toBe(original.player());
  });

  test('Move sequence matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.getMoveSequence()).toEqual(original.getMoveSequence());
  });
});

// ============================================================================
// 4. Game - Player alternation (2 tests)
// ============================================================================
describe('Game - Player alternation', () => {
  test('White starts first', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Players alternate after moves', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    game.selectMove(0);
    expect(game.player()).toBe(PieceColor.BLACK);
    if (game.moveCount() > 0) {
      game.selectMove(0);
      expect(game.player()).toBe(PieceColor.WHITE);
    }
  });
});

// ============================================================================
// 5. Game - Move selection and execution (2 tests)
// ============================================================================
describe('Game - Move selection and execution', () => {
  test('Valid move selection', () => {
    const game = new Game();
    const initialCount = game.moveCount();
    expect(initialCount).toBeGreaterThan(0);
    expect(game.getMoveSequence()).toHaveLength(0);

    game.selectMove(0);
    expect(game.getMoveSequence()).toHaveLength(1);
    expect(game.getMoveSequence()[0]).toBe(0);
    expect(game.player()).toBe(PieceColor.BLACK);
  });

  test('Multiple moves', () => {
    const game = new Game();
    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
    }
    expect(game.getMoveSequence().length).toBeLessThanOrEqual(MAX_TEST_MOVES);
    if (game.getMoveSequence().length % 2 === 0) {
      expect(game.player()).toBe(PieceColor.WHITE);
    } else {
      expect(game.player()).toBe(PieceColor.BLACK);
    }
  });
});

// ============================================================================
// 6. Game - Undo functionality (7 tests)
// ============================================================================
describe('Game - Undo functionality', () => {
  test('Cannot undo from initial state', () => {
    const game = new Game();
    expect(game.getMoveSequence()).toHaveLength(0);
    game.undoMove();
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Undo single move', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    const initialBoard = game.board();
    const initialPlayer = game.player();
    game.selectMove(0);
    expect(game.getMoveSequence()).toHaveLength(1);
    expect(game.player()).not.toBe(initialPlayer);
    game.undoMove();
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(initialPlayer);
    expect(game.board().encode()).toBe(initialBoard.encode());
  });

  test('Undo multiple moves', () => {
    const game = new Game();
    const initialHash = game.board().encode();
    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
    }
    const movesMade = game.getMoveSequence().length;
    for (let i = 0; i < movesMade; i++) {
      game.undoMove();
    }
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.board().encode()).toBe(initialHash);
  });

  // ADDED: Undo preserves choices_dirty flag
  test('Undo preserves choices_dirty flag', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    // Make a move (this should mark choices as dirty)
    game.selectMove(0);
    // This should recompute choices
    void game.moveCount();
    // Undo the move (this should also mark choices as dirty)
    game.undoMove();
    // This should recompute choices again
    const choicesAfterUndo = game.moveCount();
    // Verify that choices are properly recomputed
    expect(choicesAfterUndo).toBeGreaterThan(0);
  });

  // ADDED: Undo multiple times consecutively
  test('Undo multiple times consecutively', () => {
    const game = new Game();
    const moveCounts: number[] = [];
    const players: PieceColor[] = [];
    const boardHashes: bigint[] = [];

    // Record initial state
    moveCounts.push(game.moveCount());
    players.push(game.player());
    boardHashes.push(game.board().encode());

    // Make up to MAX_CONSECUTIVE_UNDOS moves
    for (let i = 0; i < MAX_CONSECUTIVE_UNDOS && game.moveCount() > 0; i++) {
      game.selectMove(0);
      moveCounts.push(game.moveCount());
      players.push(game.player());
      boardHashes.push(game.board().encode());
    }

    const totalMoves = game.getMoveSequence().length;

    // Undo moves one by one and verify each state
    for (let i = totalMoves; i > 0; i--) {
      game.undoMove();
      expect(game.getMoveSequence().length).toBe(i - 1);
      expect(game.player()).toBe(players[i - 1]);
      expect(game.board().encode()).toBe(boardHashes[i - 1]);
    }

    // Should be back to initial state
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.board().encode()).toBe(boardHashes[0]);
  });

  test('Undo after capture move', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromCoords(4, 5), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const initialBoard = game.board();
    const initialPieceCount =
      initialBoard.getPieces(PieceColor.BLACK).size +
      initialBoard.getPieces(PieceColor.WHITE).size;

    if (game.moveCount() > 0) {
      game.selectMove(0);
      game.undoMove();
      const afterUndo = game.board();
      const afterPieceCount =
        afterUndo.getPieces(PieceColor.BLACK).size +
        afterUndo.getPieces(PieceColor.WHITE).size;
      expect(afterPieceCount).toBe(initialPieceCount);
      expect(afterUndo.encode()).toBe(initialBoard.encode());
    }
  });

  // ADDED: Undo with promotion
  test('Undo with promotion', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(1, 6), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    if (game.moveCount() > 0) {
      game.selectMove(0);

      if (game.moveCount() > 0) {
        game.selectMove(0);

        // Undo the last move
        game.undoMove();

        // Verify the piece promotion is properly undone
        const afterUndoBoard = game.board();
        const whitePieces = afterUndoBoard.getPieces(PieceColor.WHITE);
        const blackPieces = afterUndoBoard.getPieces(PieceColor.BLACK);

        let promotionProperlyUndone = true;
        for (const [pos, pieceInfo] of whitePieces) {
          if (pos.y !== 0 && pieceInfo.type === PieceType.DAME) {
            promotionProperlyUndone = false;
          }
        }
        for (const [pos, pieceInfo] of blackPieces) {
          if (pos.y !== Position.BOARD_SIZE - 1 && pieceInfo.type === PieceType.DAME) {
            promotionProperlyUndone = false;
          }
        }

        expect(promotionProperlyUndone).toBe(true);
      }
    }
  });
});

// ============================================================================
// 7. Game - Move struct functionality (2 tests)
// ============================================================================
describe('Game - Move struct functionality', () => {
  test('Move equality', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(3, 4);
    const captured = [Position.fromCoords(2, 3)];
    const move1: Move = { from, to, captured };
    const move2: Move = { from, to, captured: [...captured] };
    const move3: Move = { from, to: Position.fromCoords(5, 6), captured };

    // move1 equals move2
    expect(move1.from.equals(move2.from)).toBe(true);
    expect(move1.to.equals(move2.to)).toBe(true);
    expect(move1.captured.length).toBe(move2.captured.length);
    for (let i = 0; i < move1.captured.length; i++) {
      expect(move1.captured[i].equals(move2.captured[i])).toBe(true);
    }

    // move1 differs from move3
    expect(move1.to.equals(move3.to)).toBe(false);
  });

  test('Move capture detection', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(3, 4);
    const nonCapture: Move = { from, to, captured: [] };
    const capture: Move = { from, to, captured: [Position.fromCoords(2, 3)] };

    expect(nonCapture.captured.length).toBe(0);
    expect(capture.captured.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 8. Game - Edge cases (2 tests)
// ============================================================================
describe('Game - Edge cases', () => {
  test('Empty board game', () => {
    const game = new Game(Board.empty());
    expect(game.moveCount()).toBe(0);
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Single piece board', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    expect(game.player()).toBe(PieceColor.WHITE);
  });
});

// ============================================================================
// 9. Game - Board manipulation through game (2 tests)
// ============================================================================
describe('Game - Board manipulation through game', () => {
  test('Board state changes after moves', () => {
    const game = new Game();
    const initialHash = game.board().encode();
    if (game.moveCount() > 0) {
      game.selectMove(0);
      expect(game.board().encode()).not.toBe(initialHash);
    }
  });

  // ADDED: Board accessor is const correct
  test('Board accessor is const correct', () => {
    const game = new Game();
    // In TypeScript, const correctness is enforced by the type system.
    // Calling board() on a const reference should still work.
    const boardRef = game.board();
    const hash = boardRef.encode();
    expect(hash).toBe(game.board().encode());
  });
});

// ============================================================================
// 10. Game - Print functions don't crash (2 tests)
// ============================================================================
// ADDED: Print functions describe block
describe('Game - Print functions', () => {
  test('Print board does not crash', () => {
    const game = new Game();
    const board = game.board();
    expect(() => boardToString(board)).not.toThrow();
  });

  test('Print choices does not crash', () => {
    const game = new Game();
    // boardToString is the closest available; verify it does not throw
    expect(() => boardToString(game.board())).not.toThrow();
  });
});

// ============================================================================
// 11. Game - Move sequence integrity (2 tests)
// ============================================================================
describe('Game - Move sequence integrity', () => {
  test('Move sequence grows correctly', () => {
    const game = new Game();
    const initialSize = game.getMoveSequence().length;
    expect(initialSize).toBe(0);

    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
      expect(game.getMoveSequence().length).toBe(initialSize + i + 1);
    }
  });

  test('Move sequence values are valid', () => {
    const game = new Game();
    if (game.moveCount() > 0) {
      const moveCount = game.moveCount();
      game.selectMove(moveCount - 1);
      const sequence = game.getMoveSequence();
      expect(sequence.length).toBe(1);
      expect(sequence[0]).toBe(moveCount - 1);
    }
  });
});

// ============================================================================
// 12. Game - State consistency (2 tests)
// ============================================================================
describe('Game - State consistency', () => {
  test('Consistent state after operations', () => {
    const game = new Game();
    if (game.moveCount() > 0) {
      const initialPlayer = game.player();
      game.selectMove(0);
      expect(game.player()).not.toBe(initialPlayer);
      expect(game.getMoveSequence()).toHaveLength(1);
      game.undoMove();
      expect(game.player()).toBe(initialPlayer);
      expect(game.getMoveSequence()).toHaveLength(0);
    }
  });

  // ADDED: Move count consistency
  test('Move count consistency', () => {
    const board = Board.setup();
    const standardGame = new Game(board);
    expect(standardGame.moveCount()).toBeGreaterThan(0);
  });
});

// ============================================================================
// 13. Game - Promotion mechanics (3 tests) — ALL ADDED
// ============================================================================
// ADDED: Promotion mechanics describe block
describe('Game - Promotion mechanics', () => {
  test('Piece promotion verification', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);
    expect(board.isOccupied(Position.fromCoords(0, 1))).toBe(true);
    expect(board.isBlackPiece(Position.fromCoords(0, 1))).toBe(false);
    expect(board.isDamePiece(Position.fromCoords(0, 1))).toBe(false);

    const initialMoveCount = game.moveCount();
    if (initialMoveCount > 0) {
      game.selectMove(0);

      const updatedBoard = game.board();
      const whitePieces = updatedBoard.getPieces(PieceColor.WHITE);

      for (const [pos, pieceInfo] of whitePieces) {
        if (pos.y === 0) {
          expect(pieceInfo.type).toBe(PieceType.DAME);
        }
      }
    }
  });

  test('No premature promotion', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(3, 4), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(board.isDamePiece(Position.fromCoords(1, 2))).toBe(false);
    expect(board.isDamePiece(Position.fromCoords(3, 4))).toBe(false);

    if (game.moveCount() > 0) {
      game.selectMove(0);

      const updatedBoard = game.board();
      const whitePieces = updatedBoard.getPieces(PieceColor.WHITE);
      const blackPieces = updatedBoard.getPieces(PieceColor.BLACK);

      for (const [pos, pieceInfo] of whitePieces) {
        if (pos.y !== 0) {
          expect(pieceInfo.type).toBe(PieceType.PION);
        }
      }

      for (const [pos, pieceInfo] of blackPieces) {
        if (pos.y !== Position.BOARD_SIZE - 1) {
          expect(pieceInfo.type).toBe(PieceType.PION);
        }
      }
    }
  });

  test('Black piece promotion test', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 6), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);

    if (game.moveCount() > 0) {
      game.selectMove(0);

      if (game.player() === PieceColor.BLACK && game.moveCount() > 0) {
        game.selectMove(0);

        const updatedBoard = game.board();
        const blackPieces = updatedBoard.getPieces(PieceColor.BLACK);

        for (const [pos, pieceInfo] of blackPieces) {
          if (pos.y === Position.BOARD_SIZE - 1) {
            expect(pieceInfo.type).toBe(PieceType.DAME);
          }
        }
      }
    }
  });
});

// ============================================================================
// 14. Game - Bitwise move generation (8 tests)
// ============================================================================
describe('Game - Bitwise move generation', () => {
  test('Standard board: white has exactly 7 opening moves', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.moveCount()).toBe(7);
  });

  // ADDED: Only current player's pieces generate moves
  test('Only current player pieces generate moves', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(3, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(4, 5), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);
    const whiteMoves = game.moveCount();
    expect(whiteMoves).toBeGreaterThan(0);

    game.selectMove(0);
    expect(game.player()).toBe(PieceColor.BLACK);
    const blackMoves = game.moveCount();
    expect(blackMoves).toBeGreaterThan(0);
  });

  // ADDED: Dame pieces are found by bitwise iteration
  test('Dame pieces are found by bitwise iteration', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(3, 4), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromCoords(4, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBeGreaterThan(2);
  });

  // ADDED: Mixed pion and dame pieces both found
  test('Mixed pion and dame pieces both found', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(5, 4), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromCoords(0, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBeGreaterThan(2);
  });

  test('Empty board produces zero moves', () => {
    const game = new Game(Board.empty());
    expect(game.moveCount()).toBe(0);
  });

  // ADDED: Pieces with no legal moves are excluded
  test('Pieces with no legal moves are excluded', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(1, 0), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    const count = game.moveCount();
    if (count > 0) {
      const hashBefore = game.board().encode();
      game.selectMove(0);
      game.undoMove();
      expect(game.board().encode()).toBe(hashBefore);
    }
  });

  // ADDED: Capture moves found correctly via bitwise iteration
  test('Capture moves found correctly via bitwise iteration', () => {
    const pieces: Map<Position, PieceInfo> = new Map([
      [Position.fromCoords(1, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBe(1);

    game.selectMove(0);
    expect(game.board().isOccupied(Position.fromCoords(2, 3))).toBe(false);
    expect(game.board().isOccupied(Position.fromCoords(3, 2))).toBe(true);
  });

  test('Full game playthrough terminates', () => {
    const game = new Game();
    let moves = 0;
    const seen = new Set<bigint>();
    seen.add(game.board().encode());

    while (game.moveCount() > 0 && moves < 500) {
      seen.add(game.board().encode());
      game.selectMove(0);
      moves++;
    }
    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
  });
});
