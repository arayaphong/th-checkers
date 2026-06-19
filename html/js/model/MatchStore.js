// Source of truth for the match: the snapshot history, the move that produced
// each snapshot, the current position, and last-move presentation metadata.
// Mutating commands emit `match:changed`; views render from the store.
import { Game, PieceColor, PieceType } from '../../../dist/index.js';
import { Events } from '../core/events.js';
import { colorAt } from '../util/coords.js';

export class MatchStore {
  #bus;
  #history; // history[0] is the initial position
  #moves; // parallel to history; moves[i] produced history[i]
  #index;
  #game; // live, mutable copy of history[#index]
  #lastMove; // { move, mover } of the most recent commit
  #lastPromotion; // whether that commit promoted a piece

  constructor(bus) {
    this.#bus = bus;
    this.#init();
  }

  #init() {
    this.#history = [new Game()];
    this.#moves = [null];
    this.#index = 0;
    this.#game = Game.copy(this.#history[0]);
    this.#lastMove = null;
    this.#lastPromotion = false;
  }

  // --- queries ---
  game() {
    return this.#game;
  }

  index() {
    return this.#index;
  }

  canUndo() {
    return this.#index > 0;
  }

  canRedo() {
    return this.#index < this.#history.length - 1;
  }

  isGameOver() {
    return this.#game.moveCount() === 0;
  }

  lastMove() {
    return this.#lastMove;
  }

  lastPromotion() {
    return this.#lastPromotion;
  }

  // Pieces captured by each player so far, derived from the move history.
  capturedPieces() {
    const capturedByP1 = []; // black pieces taken by player 1
    const capturedByP2 = []; // white pieces taken by player 2
    for (let i = 1; i <= this.#index; i++) {
      const move = this.#moves[i];
      if (!move || move.captured.length === 0) continue;
      const prevBoard = this.#history[i - 1].board();
      for (const capPos of move.captured) {
        const color = colorAt(prevBoard, capPos);
        const type = prevBoard.isDamePiece(capPos) ? PieceType.DAME : PieceType.PION;
        if (color === PieceColor.BLACK) capturedByP1.push({ color, type });
        else capturedByP2.push({ color, type });
      }
    }
    return { capturedByP1, capturedByP2 };
  }

  // Played moves up to the current position, oldest first.
  historyEntries() {
    const entries = [];
    for (let i = 1; i <= this.#index; i++) {
      entries.push({
        index: i,
        move: this.#moves[i],
        mover: this.#history[i - 1].player(),
        isCurrent: i === this.#index,
      });
    }
    return entries;
  }

  // --- commands ---
  reset() {
    this.#init();
    this.#emit();
  }

  // Commit the chosen legal move, recording it in history. Returns the
  // committed move plus whether it promoted a piece (for sound/animation).
  commit(moveIndex) {
    if (this.#index < this.#history.length - 1) {
      this.#history = this.#history.slice(0, this.#index + 1);
      this.#moves = this.#moves.slice(0, this.#index + 1);
    }

    const move = this.#game.getMoves()[moveIndex];
    const mover = this.#game.player();
    const wasDame = this.#game.board().isDamePiece(move.from);
    this.#game.selectMove(moveIndex);
    this.#lastPromotion = !wasDame && this.#game.board().isDamePiece(move.to);
    this.#lastMove = { move, mover };

    this.#history.push(Game.copy(this.#game));
    this.#moves.push(move);
    this.#index++;
    this.#emit();
    return { move, mover, promoted: this.#lastPromotion };
  }

  undo() {
    if (!this.canUndo()) return false;
    this.#index--;
    this.#game = Game.copy(this.#history[this.#index]);
    this.#lastPromotion = false;
    this.#emit();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.#index++;
    this.#game = Game.copy(this.#history[this.#index]);
    this.#lastPromotion = false;
    this.#emit();
    return true;
  }

  // Clear the promotion highlight without a re-render (the caller renders).
  clearLastPromotion() {
    this.#lastPromotion = false;
  }

  #emit() {
    this.#bus.emit(Events.MATCH_CHANGED, { store: this });
  }
}
