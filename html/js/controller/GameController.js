// Orchestrates a game: translates board/control input into store mutations,
// runs the move animation, and re-renders the views when the match changes.
// All collaborators are injected; this class touches the DOM only for the
// control event wiring and the pre-animation class cleanup.
import { PieceColor } from '../../../dist/index.js';
import { htmlToPos, posToHtml } from '../util/coords.js';
import { Events } from '../core/events.js';
import { i18n as defaultI18n } from '../i18n/i18n.js';

export class GameController {
  #bus;
  #matchStore;
  #selection;
  #animator;
  #boardView;
  #historyView;
  #statsView;
  #statusView;
  #gameOverView;
  #focusManager;
  #controls;
  #i18n;

  constructor({
    bus,
    matchStore,
    selectionStore,
    animator,
    boardView,
    historyView,
    statsView,
    statusView,
    gameOverView,
    focusManager,
    controls,
    i18n = defaultI18n,
  }) {
    this.#bus = bus;
    this.#matchStore = matchStore;
    this.#selection = selectionStore;
    this.#animator = animator;
    this.#boardView = boardView;
    this.#historyView = historyView;
    this.#statsView = statsView;
    this.#statusView = statusView;
    this.#gameOverView = gameOverView;
    this.#focusManager = focusManager;
    this.#controls = controls;
    this.#i18n = i18n;
  }

  // Subscribe to match changes and attach the control event handlers.
  start() {
    this.#bus.on(Events.MATCH_CHANGED, () => this.#render());
    this.#wireControls();
  }

  // Start a fresh game (also used as the reset/play-again action).
  newGame() {
    this.#bus.emit(Events.SOUND_WIN_STOP);
    this.#focusManager.hideGameOver({ restoreFocus: false });
    this.#selection.clear();
    this.#boardView.resetFocus();
    this.#statusView.resetAnnouncement();
    this.#matchStore.reset(); // emits match:changed -> render
  }

  // Re-render every view after a locale change so dynamic text is translated.
  refresh() {
    this.#statusView.resetAnnouncement();
    this.#gameOverView.refresh();
    this.#render();
    if (this.#matchStore.isGameOver() && this.#gameOverView.isOpen()) {
      const current = this.#matchStore.game().player();
      const winner = current === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
      this.#focusManager.showGameOver(winner, this.#gameOverReason());
    }
  }

  // Board input: select a piece, play a legal move, or clear the selection.
  activateSquare(r, c) {
    if (this.#selection.isAnimating()) return;
    if (this.#matchStore.isGameOver()) {
      this.#boardView.cancelFocusRestore();
      return;
    }
    this.#matchStore.clearLastPromotion();

    const pos = htmlToPos(r, c);

    if (this.#isCurrentPlayerPiece(pos)) {
      const movesForPiece = this.#legalMovesFor(pos);
      if (movesForPiece.length === 0) {
        this.#selection.clear();
        this.#render();
        return;
      }
      this.#selection.select({ r, c }, movesForPiece);
      this.#render();
      return;
    }

    if (this.#selection.hasSelection()) {
      const target = this.#selection.validMoves().find((m) => m.r === r && m.c === c);
      if (target) {
        this.#selection.setAnimating(true);
        document.querySelectorAll('.square').forEach((sq) => {
          sq.classList.remove('selected', 'valid-move');
        });
        this.#applyMove(target.moveIndex);
        return;
      }
    }

    this.#selection.clear();
    this.#render();
  }

  #render() {
    this.#boardView.render({
      selectedSquare: this.#selection.selected(),
      validMoves: this.#selection.validMoves(),
    });
    this.#historyView.render();
    this.#statsView.render();
    this.#statusView.render({ isAnimating: this.#selection.isAnimating() });
  }

  #applyMove(moveIndex) {
    const move = this.#matchStore.game().getMoves()[moveIndex];
    const from = posToHtml(move.from);
    const to = posToHtml(move.to);
    const captured = move.captured.map((p) => posToHtml(p));

    this.#animator.move({ from, to, captured }, () => {
      // Clear interaction state first so the commit-driven render reflects it.
      this.#selection.clear();
      this.#selection.setAnimating(false);
      const { move: committed, promoted } = this.#matchStore.commit(moveIndex); // emits -> render
      this.#bus.emit(
        Events.SOUND_PLAY,
        promoted ? 'promote' : committed.captured.length > 0 ? 'capture' : 'move',
      );
      this.#checkGameOver();
    });
  }

  #checkGameOver() {
    if (!this.#matchStore.isGameOver()) return;
    const current = this.#matchStore.game().player();
    const winner = current === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    this.#bus.emit(Events.SOUND_PLAY, 'win');
    this.#focusManager.showGameOver(winner, this.#gameOverReason());
  }

  #gameOverReason() {
    const current = this.#matchStore.game().player();
    const board = this.#matchStore.game().board();
    const hasPieces = board.getPieces(current).size > 0;
    return this.#i18n.t(
      hasPieces ? 'gameOver.reasons.noMoves' : 'gameOver.reasons.noPieces',
    );
  }

  #undo() {
    if (this.#matchStore.canUndo() && !this.#selection.isAnimating()) {
      this.#focusManager.hideGameOver();
      this.#selection.clear();
      this.#matchStore.undo(); // emits match:changed -> render
    }
  }

  #redo() {
    if (this.#matchStore.canRedo() && !this.#selection.isAnimating()) {
      this.#selection.clear();
      this.#matchStore.redo(); // emits match:changed -> render
      this.#checkGameOver();
    }
  }

  #isCurrentPlayerPiece(pos) {
    const board = this.#matchStore.game().board();
    if (!board.isOccupied(pos)) return false;
    const pieceColor = board.isBlackPiece(pos) ? PieceColor.BLACK : PieceColor.WHITE;
    return pieceColor === this.#matchStore.game().player();
  }

  #legalMovesFor(pos) {
    return this.#matchStore.game().getMoves().flatMap((move, moveIndex) => {
      if (!move.from.equals(pos)) return [];
      const { r, c } = posToHtml(move.to);
      return [{ r, c, moveIndex }];
    });
  }

  #wireControls() {
    const { btnUndo, btnRedo, btnReset, btnPlayAgain, btnReview } = this.#controls;

    // Guard: ensure buttons exist before wiring
    if (!btnUndo || !btnRedo || !btnReset || !btnPlayAgain || !btnReview) {
      console.error('GameController: Missing button elements:', {
        btnUndo: !!btnUndo,
        btnRedo: !!btnRedo,
        btnReset: !!btnReset,
        btnPlayAgain: !!btnPlayAgain,
        btnReview: !!btnReview,
      });
      return;
    }

    btnUndo.addEventListener('click', () => {
      if (!this.#selection.isAnimating()) this.#undo();
    });
    btnRedo.addEventListener('click', () => {
      if (!this.#selection.isAnimating()) this.#redo();
    });
    btnReset.addEventListener('click', () => {
      if (!this.#selection.isAnimating()) this.newGame();
    });
    btnPlayAgain.addEventListener('click', () => {
      if (!this.#selection.isAnimating()) {
        this.newGame();
        this.#focusManager.focusBoard();
      }
    });
    btnReview.addEventListener('click', () => {
      this.#bus.emit(Events.SOUND_WIN_STOP);
      this.#focusManager.hideGameOver();
    });

    this.#gameOverView.element().addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.#focusManager.hideGameOver();
    });

    document.addEventListener('keydown', (event) => {
      if (!this.#gameOverView.isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.#focusManager.hideGameOver();
        return;
      }
      if (event.key !== 'Tab') return;
      this.#gameOverView.trapTab(event);
    });
  }
}
