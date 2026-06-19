// Holds the player's in-progress interaction with the board: the selected
// square, its legal targets, and whether a move animation is in flight. This
// is transient UI state (not part of the match), so the controller reads and
// mutates it and decides when to re-render.
export class SelectionStore {
  #selected = null;
  #validMoves = [];
  #animating = false;

  selected() {
    return this.#selected;
  }

  validMoves() {
    return this.#validMoves;
  }

  hasSelection() {
    return this.#selected !== null;
  }

  isAnimating() {
    return this.#animating;
  }

  select(square, validMoves) {
    this.#selected = square;
    this.#validMoves = validMoves;
  }

  clear() {
    this.#selected = null;
    this.#validMoves = [];
  }

  setAnimating(value) {
    this.#animating = value;
  }
}
