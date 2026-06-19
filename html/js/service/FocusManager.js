// Coordinates the two modal overlays and the focus dance around them: it
// remembers what was focused before an overlay opened, inerts the game while a
// modal is up, restores focus on close, and hands off between the game-over
// modal and the persistent viewport warning (the latter reappears whenever the
// window is too small). The overlays themselves are dumb DOM wrappers.
export class FocusManager {
  #section;
  #gameOverView;
  #viewportView;
  #viewportStore;
  #onFocusBoard;
  #focusBeforeGameOver = null;
  #focusBeforeViewport = null;

  constructor({ section, gameOverView, viewportView, viewportStore, onFocusBoard }) {
    this.#section = section;
    this.#gameOverView = gameOverView;
    this.#viewportView = viewportView;
    this.#viewportStore = viewportStore;
    this.#onFocusBoard = onFocusBoard;
  }

  showGameOver(winnerColor, reason) {
    this.#positionGameOverOverlay();
    this.#gameOverView.setResult(winnerColor, reason);

    if (!this.#gameOverView.isOpen()) {
      this.#focusBeforeGameOver =
        this.#viewportView.isOpen() && this.#isConnected(this.#focusBeforeViewport)
          ? this.#focusBeforeViewport
          : document.activeElement;
    }
    this.#suspendViewport();
    this.#section.inert = true;
    this.#gameOverView.open();
    this.#gameOverView.focusFirst();
  }

  hideGameOver({ restoreFocus = true } = {}) {
    const previousFocus = this.#focusBeforeGameOver;

    this.#gameOverView.close();
    this.#focusBeforeGameOver = null;

    if (this.#viewportStore.isTooSmall()) {
      if (!this.#isConnected(this.#focusBeforeViewport)) this.#focusBeforeViewport = previousFocus;
      this.#showViewport({ preserveFocus: true });
      return;
    }

    this.#section.inert = false;
    this.#focusBeforeViewport = null;

    if (restoreFocus && this.#isConnected(previousFocus)) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  // Re-read the window size and show or hide the viewport warning to match.
  checkSize() {
    if (this.#gameOverView.isOpen()) this.#positionGameOverOverlay();

    if (this.#viewportStore.refresh()) {
      this.#showViewport();
    } else {
      this.#hideViewport();
    }
  }

  #positionGameOverOverlay() {
    const overlay = this.#gameOverView.element();
    const rect = this.#section.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const right = Math.min(window.innerWidth, rect.right);
    const width = Math.max(0, right - left);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const height = Math.max(0, bottom - top);

    overlay.style.left = `${left}px`;
    overlay.style.width = `${width}px`;
    overlay.style.top = `${top}px`;
    overlay.style.height = `${height}px`;
  }

  focusBoard() {
    if (this.#viewportStore.isTooSmall()) {
      this.#viewportView.focus();
      return;
    }
    this.#onFocusBoard();
  }

  #showViewport({ preserveFocus = false } = {}) {
    if (this.#gameOverView.isOpen() || this.#viewportView.isOpen()) return;
    if (!preserveFocus || !this.#isConnected(this.#focusBeforeViewport)) {
      this.#focusBeforeViewport = document.activeElement;
    }
    this.#section.inert = true;
    this.#viewportView.open();
  }

  // Hide the warning without restoring focus or releasing inert (used when the
  // game-over modal takes over the screen).
  #suspendViewport() {
    if (!this.#viewportView.isOpen()) return;
    this.#viewportView.hide();
  }

  #hideViewport() {
    const wasActive = this.#viewportView.isOpen() || this.#focusBeforeViewport !== null;
    if (!wasActive) return;

    const previousFocus = this.#focusBeforeViewport;
    this.#suspendViewport();
    this.#focusBeforeViewport = null;

    if (this.#gameOverView.isOpen()) return;
    this.#section.inert = false;
    if (this.#isConnected(previousFocus)) {
      previousFocus.focus({ preventScroll: true });
    } else {
      this.#onFocusBoard();
    }
  }

  #isConnected(el) {
    return Boolean(el?.isConnected);
  }
}
