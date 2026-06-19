// FLIP-style move animation: clones the moving piece, transitions the clone to
// the destination square, and fades any captured pieces. `onDone` runs when the
// animation finishes — and synchronously when the user prefers reduced motion,
// so callers can rely on the committed state being applied without awaiting.
const DURATION_MS = 300;

export class Animator {
  #prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  // from/to/captured are board coordinates of the form { r, c }.
  move({ from, to, captured = [] }, onDone) {
    if (this.#prefersReducedMotion()) {
      onDone();
      return;
    }

    const fromSq = this.#square(from.r, from.c);
    const toSq = this.#square(to.r, to.c);
    const piece = fromSq?.querySelector('.piece');
    if (!piece || !toSq) {
      onDone();
      return;
    }

    const pieceRect = piece.getBoundingClientRect();
    const clone = piece.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = `${pieceRect.left}px`;
    clone.style.top = `${pieceRect.top}px`;
    clone.style.width = `${pieceRect.width}px`;
    clone.style.height = `${pieceRect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '1000';
    clone.style.transition = `all ${DURATION_MS}ms ease-in-out`;
    clone.style.pointerEvents = 'none';
    clone.style.boxSizing = 'border-box';

    document.body.appendChild(clone);
    piece.style.opacity = '0';

    for (const cap of captured) {
      const capturedEl = this.#square(cap.r, cap.c)?.querySelector('.piece');
      if (capturedEl) {
        capturedEl.style.transition = `opacity ${DURATION_MS}ms ease-in`;
        capturedEl.style.opacity = '0';
      }
    }

    requestAnimationFrame(() => {
      const toRect = toSq.getBoundingClientRect();
      clone.style.left = `${toRect.left + (toRect.width - pieceRect.width) / 2}px`;
      clone.style.top = `${toRect.top + (toRect.height - pieceRect.height) / 2}px`;
      setTimeout(() => {
        clone.remove();
        onDone();
      }, DURATION_MS);
    });
  }

  #square(r, c) {
    return document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
  }
}
