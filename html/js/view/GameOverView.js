// The end-of-game modal: renders the winner/result and provides the show/hide
// and focus-trap primitives. Focus saving, background inerting, and the
// handoff with the viewport warning are coordinated by FocusManager.
import { PieceColor } from '../../../dist/index.js';

export class GameOverView {
  #overlay;
  #title;
  #desc;

  constructor(overlay, { titleEl, descEl }) {
    this.#overlay = overlay;
    this.#title = titleEl;
    this.#desc = descEl;
  }

  element() {
    return this.#overlay;
  }

  isOpen() {
    return this.#overlay.style.display === 'flex';
  }

  setResult(winnerColor, reason) {
    if (winnerColor === PieceColor.WHITE) {
      this.#title.innerHTML = 'ผู้เล่น 1 ชนะ! 🔴';
      this.#title.className = 'game-over-title winner-p1';
    } else {
      this.#title.innerHTML = 'ผู้เล่น 2 ชนะ! ⚫';
      this.#title.className = 'game-over-title winner-p2';
    }
    this.#desc.textContent = reason;
  }

  open() {
    this.#overlay.setAttribute('aria-hidden', 'false');
    this.#overlay.style.display = 'flex';
  }

  close() {
    this.#overlay.style.display = 'none';
    this.#overlay.setAttribute('aria-hidden', 'true');
  }

  focusFirst() {
    this.#overlay.querySelector('.game-over-modal button').focus();
  }

  // Cycle Tab/Shift+Tab within the modal's enabled buttons.
  trapTab(event) {
    const buttons = [...this.#overlay.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;

    const active = document.activeElement;
    const outside = !this.#overlay.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }
}
