// FLIP-style move animation: clones the moving piece, transitions the clone to
// the destination square, and fades any captured pieces. `onDone` runs when the
// animation finishes — and synchronously when the user prefers reduced motion,
// so callers can rely on the committed state being applied without awaiting.
//
// Accepts either the legacy { from, to, captured } shape (single-leg) or
// { path, capturedPerLeg } for multi-jump traces where the piece travels through
// several intermediate landings.  The two shapes are normalised internally.
const DURATION_MS = 300;

/** @typedef {{ r: number, c: number }} BoardCoord */

export class Animator {
  #prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /**
   * @param {{ from?: BoardCoord, to?: BoardCoord, captured?: BoardCoord[],
   *           path?: BoardCoord[], capturedPerLeg?: BoardCoord[][] }} move
   * @param {() => void} onDone
   */
  move({ from, to, captured = [], path, capturedPerLeg }, onDone) {
    if (this.#prefersReducedMotion()) {
      onDone();
      return;
    }

    // Normalise to multi-leg format.
    const legs = path ?? [from, to];
    const perLeg = capturedPerLeg ?? [captured];

    if (legs.length < 2) {
      onDone();
      return;
    }

    const fromSq = this.#square(legs[0].r, legs[0].c);
    const piece = fromSq?.querySelector('.piece');
    if (!piece) {
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
    clone.style.pointerEvents = 'none';
    clone.style.boxSizing = 'border-box';

    document.body.appendChild(clone);
    piece.style.opacity = '0';

    const animateLeg = (legIndex) => {
      // Fade this leg's captured pieces concurrent with the movement.
      for (const cap of (perLeg[legIndex] ?? [])) {
        const capturedEl = this.#square(cap.r, cap.c)?.querySelector('.piece');
        if (capturedEl) {
          capturedEl.style.transition = `opacity ${DURATION_MS}ms ease-in`;
          capturedEl.style.opacity = '0';
        }
      }

      const toCoord = legs[legIndex + 1];
      const toSq = this.#square(toCoord.r, toCoord.c);
      if (!toSq) {
        clone.remove();
        onDone();
        return;
      }

      const toRect = toSq.getBoundingClientRect();
      requestAnimationFrame(() => {
        clone.style.transition = `left ${DURATION_MS}ms ease-in-out, top ${DURATION_MS}ms ease-in-out`;
        clone.style.left = `${toRect.left + (toRect.width - pieceRect.width) / 2}px`;
        clone.style.top = `${toRect.top + (toRect.height - pieceRect.height) / 2}px`;
        setTimeout(() => {
          if (legIndex + 2 < legs.length) {
            animateLeg(legIndex + 1);
          } else {
            clone.remove();
            onDone();
          }
        }, DURATION_MS);
      });
    };

    animateLeg(0);
  }

  #square(r, c) {
    return document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
  }
}
