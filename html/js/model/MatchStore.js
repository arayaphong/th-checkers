// Source of truth for the match: the snapshot history, the move that produced
// each snapshot, the current position, and last-move presentation metadata.
// Mutating commands emit `match:changed`; views render from the store.
import { Board, Game, PieceColor, PieceType } from '../../../dist/index.js';
import { Events } from '../core/events.js';
import { colorAt } from '../util/coords.js';

export class MatchStore {
  static STORAGE_KEY = 'th-checkers:match:v2';

  #bus;
  #history; // history[0] is the initial position
  #moves; // parallel to history; moves[i] produced history[i]
  #moveIndexes; // move index sequence used to build #history beyond initial
  #index;
  #game; // live, mutable copy of history[#index]
  #lastMove; // { move, mover } of the most recent commit
  #lastPromotion; // whether that commit promoted a piece

  constructor(bus, { initialGame } = {}) {
    this.#bus = bus;
    this.#init({ restoreSnapshot: true, initialGame });
  }

  #init({ restoreSnapshot, initialGame }) {
    const restored = restoreSnapshot ? this.#restore() : null;
    if (restored) {
      this.#history = restored.history;
      this.#moves = restored.moves;
      this.#moveIndexes = restored.moveIndexes;
      this.#index = restored.index;
      this.#game = Game.copy(this.#history[this.#index]);
      this.#lastMove =
        this.#index > 0
          ? { move: this.#moves[this.#index], mover: this.#history[this.#index - 1].player() }
          : null;
      this.#lastPromotion = this.#index > 0 ? this.#didPromoteAt(this.#index) : false;
      return;
    }

    const initial = initialGame ?? new Game();
    this.#history = [initial];
    this.#moves = [null];
    this.#moveIndexes = [];
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
    for (let i = 1; i < this.#history.length; i++) {
      entries.push({
        index: i,
        move: this.#moves[i],
        mover: this.#history[i - 1].player(),
        promoted: this.#didPromoteAt(i),
        isCurrent: i === this.#index,
        isFuture: i > this.#index,
      });
    }
    return entries;
  }

  #didPromoteAt(index) {
    const move = this.#moves[index];
    if (!move) return false;

    const before = this.#history[index - 1].board();
    const after = this.#history[index].board();
    if (!before.isOccupied(move.from) || !after.isOccupied(move.to)) return false;

    const beforeIsBlack = before.isBlackPiece(move.from);
    const afterIsBlack = after.isBlackPiece(move.to);
    if (beforeIsBlack !== afterIsBlack) return false;

    return !before.isDamePiece(move.from) && after.isDamePiece(move.to);
  }

  // --- commands ---
  reset() {
    this.#init({ restoreSnapshot: false });
    this.#emit();
  }

  // Replace the current match with a new initial game and start fresh.
  loadCustomGame(game) {
    this.#history = [game];
    this.#moves = [null];
    this.#moveIndexes = [];
    this.#index = 0;
    this.#game = Game.copy(game);
    this.#lastMove = null;
    this.#lastPromotion = false;
    this.#emit();
  }

  // Commit the chosen legal move, recording it in history. Returns the
  // committed move plus whether it promoted a piece (for sound/animation).
  commit(moveIndex) {
    if (this.#index < this.#history.length - 1) {
      this.#history = this.#history.slice(0, this.#index + 1);
      this.#moves = this.#moves.slice(0, this.#index + 1);
      this.#moveIndexes = this.#moveIndexes.slice(0, this.#index);
    }

    const move = this.#game.getMoves()[moveIndex];
    const mover = this.#game.player();
    const wasDame = this.#game.board().isDamePiece(move.from);
    this.#game.selectMove(moveIndex);
    this.#lastPromotion = !wasDame && this.#game.board().isDamePiece(move.to);
    this.#lastMove = { move, mover };

    this.#history.push(Game.copy(this.#game));
    this.#moves.push(move);
    this.#moveIndexes.push(moveIndex);
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
    this.#persist();
    this.#bus.emit(Events.MATCH_CHANGED, { store: this });
  }

  #restore() {
    const snapshot = this.#readSnapshot();
    if (!snapshot) return null;

    const moveIndexes = Array.isArray(snapshot.moveIndexes)
      ? snapshot.moveIndexes.filter((index) => Number.isInteger(index) && index >= 0)
      : [];

    const initialGame = this.#decodeInitialBoard(snapshot.initialBoard);
    const history = [initialGame];
    const moves = [null];
    let game = Game.copy(history[0]);

    for (const index of moveIndexes) {
      const choices = game.getMoves();
      if (index >= choices.length) {
        this.#clearSnapshot();
        return null;
      }
      const move = choices[index];
      game.selectMove(index);
      history.push(Game.copy(game));
      moves.push(move);
    }

    const requestedIndex = Number.isInteger(snapshot.index) ? snapshot.index : history.length - 1;
    const clampedIndex = Math.max(0, Math.min(requestedIndex, history.length - 1));

    return {
      history,
      moves,
      moveIndexes,
      index: clampedIndex,
    };
  }

  #decodeInitialBoard(raw) {
    if (typeof raw !== 'string' || raw === '') {
      return new Game();
    }
    try {
      const encoded = BigInt(raw);
      const board = Board.decode(encoded);
      return new Game(board);
    } catch {
      // Fall back to the standard setup if the stored board is corrupt.
      return new Game();
    }
  }

  #persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      const initialBoard = this.#history[0].board().encode();
      localStorage.setItem(
        MatchStore.STORAGE_KEY,
        JSON.stringify({
          version: 2,
          initialBoard: initialBoard.toString(),
          moveIndexes: this.#moveIndexes,
          index: this.#index,
        }),
      );
    } catch {
      // Persistence is best-effort; gameplay should continue even if blocked.
    }
  }

  #readSnapshot() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(MatchStore.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) return null;
      return parsed;
    } catch {
      this.#clearSnapshot();
      return null;
    }
  }

  #clearSnapshot() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(MatchStore.STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}
