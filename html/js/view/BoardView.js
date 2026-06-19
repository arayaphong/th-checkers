// Renders the 8x8 board from the match position and the current selection, and
// owns keyboard/roving-tabindex focus within the grid. Square activations are
// forwarded to the controller via the `onActivate` callback; all match and
// selection state is supplied by the caller.
import { BOARD_SIZE, htmlToPos, isDarkSquare, pieceColorClass } from '../util/coords.js';
import { squareLabel } from '../util/strings.th.js';
import { PieceColor } from '../../../dist/index.js';

export class BoardView {
  #boardEl;
  #matchStore;
  #onActivate;
  #focusedSquare = { r: 0, c: 1 };
  #restoreFocus = false;

  constructor(boardEl, { matchStore, onActivate }) {
    this.#boardEl = boardEl;
    this.#matchStore = matchStore;
    this.#onActivate = onActivate;
  }

  // Return the roving tab stop to its initial dark square (new game).
  resetFocus() {
    this.#focusedSquare = { r: 0, c: 1 };
  }

  // Suppress the focus restore the next render would otherwise perform.
  cancelFocusRestore() {
    this.#restoreFocus = false;
  }

  focusCurrent() {
    this.#squareAt(this.#focusedSquare.r, this.#focusedSquare.c)?.focus({ preventScroll: true });
  }

  render({ selectedSquare, validMoves }) {
    this.#boardEl.innerHTML = '';
    const game = this.#matchStore.game();
    const board = game.board();
    const movablePositions = new Set(game.getMoves().map((move) => move.from.hash()));

    for (let r = 0; r < BOARD_SIZE; r++) {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.setAttribute('role', 'row');
      for (let c = 0; c < BOARD_SIZE; c++) {
        row.appendChild(
          this.#renderSquare(r, c, { game, board, movablePositions, selectedSquare, validMoves }),
        );
      }
      this.#boardEl.appendChild(row);
    }
    this.#boardEl.setAttribute('aria-disabled', String(this.#matchStore.isGameOver()));

    if (this.#restoreFocus) {
      this.#restoreFocus = false;
      this.focusCurrent();
    }
  }

  #renderSquare(r, c, { game, board, movablePositions, selectedSquare, validMoves }) {
    const dark = isDarkSquare(r, c);
    const pos = dark ? htmlToPos(r, c) : null;
    const hasLegalMove = dark && movablePositions.has(pos.hash());
    const isSelected = Boolean(selectedSquare && selectedSquare.r === r && selectedSquare.c === c);

    const square = document.createElement('div');
    square.className = `square ${dark ? 'dark' : 'light'}`;
    square.dataset.r = String(r);
    square.dataset.c = String(c);
    square.setAttribute('role', 'gridcell');
    square.setAttribute('aria-rowindex', String(r + 1));
    square.setAttribute('aria-colindex', String(c + 1));
    square.setAttribute(
      'aria-label',
      squareLabel({
        r,
        c,
        dark,
        board,
        pos,
        hasLegalMove,
        selectedSquare,
        validMoves,
        currentPlayer: game.player(),
      }),
    );
    square.setAttribute('aria-selected', String(isSelected));
    square.tabIndex = this.#focusedSquare.r === r && this.#focusedSquare.c === c ? 0 : -1;

    if (isSelected) square.classList.add('selected');
    if (validMoves.some((m) => m.r === r && m.c === c)) square.classList.add('valid-move');

    if (dark && board.isOccupied(pos)) {
      square.appendChild(this.#renderPiece(board, pos, hasLegalMove));
    }

    square.addEventListener('click', () => {
      const previousTabStop = this.#boardEl.querySelector('.square[tabindex="0"]');
      if (previousTabStop) previousTabStop.tabIndex = -1;
      square.tabIndex = 0;
      this.#focusedSquare = { r, c };
      if (dark) {
        this.#restoreFocus = true;
        this.#onActivate(r, c);
      }
    });
    square.addEventListener('keydown', (event) => this.#handleKeyDown(event, r, c));

    return square;
  }

  #renderPiece(board, pos, hasLegalMove) {
    const isBlack = board.isBlackPiece(pos);
    const isDame = board.isDamePiece(pos);
    const piece = document.createElement('div');
    piece.className = `piece ${pieceColorClass(isBlack ? PieceColor.BLACK : PieceColor.WHITE)}`;
    if (hasLegalMove) piece.classList.add('movable');
    if (isDame) piece.classList.add('king');
    const lastMove = this.#matchStore.lastMove();
    if (this.#matchStore.lastPromotion() && lastMove && lastMove.move.to.equals(pos)) {
      piece.classList.add('promoted');
    }
    return piece;
  }

  #handleKeyDown(event, r, c) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isDarkSquare(r, c)) return;
      this.#focusedSquare = { r, c };
      this.#restoreFocus = true;
      this.#onActivate(r, c);
      return;
    }

    const direction = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[event.key];

    let nextR = r;
    let nextC = c;
    if (direction) {
      nextR = Math.max(0, Math.min(BOARD_SIZE - 1, r + direction[0]));
      nextC = Math.max(0, Math.min(BOARD_SIZE - 1, c + direction[1]));
    } else if (event.key === 'Home') {
      nextC = 0;
    } else if (event.key === 'End') {
      nextC = BOARD_SIZE - 1;
    } else {
      return;
    }

    event.preventDefault();
    const current = event.currentTarget;
    const next = this.#squareAt(nextR, nextC);
    if (!next || next === current) return;
    current.tabIndex = -1;
    next.tabIndex = 0;
    this.#focusedSquare = { r: nextR, c: nextC };
    next.focus();
  }

  #squareAt(r, c) {
    return this.#boardEl.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
  }
}
