// The "viewport too small" warning overlay. Owns only its DOM; when it is
// shown and hidden, and the focus bookkeeping, are driven by FocusManager.
export class ViewportView {
  #overlay;

  constructor(overlay) {
    this.#overlay = overlay;
  }

  isOpen() {
    return this.#overlay.style.display === 'flex';
  }

  open() {
    this.#overlay.setAttribute('aria-hidden', 'false');
    this.#overlay.style.display = 'flex';
    this.focus();
  }

  hide() {
    this.#overlay.style.display = 'none';
    this.#overlay.setAttribute('aria-hidden', 'true');
  }

  focus() {
    this.#overlay.focus({ preventScroll: true });
  }
}
