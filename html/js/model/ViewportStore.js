// Knows the minimum playable viewport and whether the current window falls
// below it. `refresh` re-reads the window size (call on resize); `isTooSmall`
// returns the value from the last refresh.
export class ViewportStore {
  #minWidth;
  #minHeight;
  #tooSmall = false;

  constructor({ minWidth = 600, minHeight = 480 } = {}) {
    this.#minWidth = minWidth;
    this.#minHeight = minHeight;
  }

  refresh() {
    this.#tooSmall = window.innerWidth < this.#minWidth || window.innerHeight < this.#minHeight;
    return this.#tooSmall;
  }

  isTooSmall() {
    return this.#tooSmall;
  }
}
