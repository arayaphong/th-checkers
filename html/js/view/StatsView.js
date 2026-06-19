// Renders each player's captured-pieces tray from the store, with an
// accessible screen-reader summary alongside the visual icons.
import { PieceColor, PieceType } from '../../../dist/index.js';
import { capturedSummary } from '../util/strings.th.js';

export class StatsView {
  #p1El;
  #p2El;
  #matchStore;

  constructor({ matchStore, capturedByP1El, capturedByP2El }) {
    this.#matchStore = matchStore;
    this.#p1El = capturedByP1El;
    this.#p2El = capturedByP2El;
  }

  render() {
    const { capturedByP1, capturedByP2 } = this.#matchStore.capturedPieces();
    this.#p1El.innerHTML = `<span class="sr-only">${capturedSummary('ผู้เล่น 1', capturedByP1)}</span>${this.#captureHtml(capturedByP1)}`;
    this.#p2El.innerHTML = `<span class="sr-only">${capturedSummary('ผู้เล่น 2', capturedByP2)}</span>${this.#captureHtml(capturedByP2)}`;
  }

  #captureHtml(capturedList) {
    if (capturedList.length === 0) {
      return '<span class="no-captures" aria-hidden="true">—</span>';
    }
    return capturedList
      .map((p) => {
        const pClass = p.color === PieceColor.WHITE ? 'p1' : 'p2';
        return p.type === PieceType.DAME
          ? `<span class="cap-piece dame ${pClass}" aria-hidden="true">${this.#crownSvg()}</span>`
          : `<span class="cap-piece ${pClass}" aria-hidden="true"></span>`;
      })
      .join('');
  }

  #crownSvg() {
    return `<svg viewBox="0 0 20 19" width="12" height="11" fill="#f1c40f" aria-hidden="true" focusable="false"><polygon points="10,1 12.9,7 19.5,7.6 14.7,12 16.2,18.5 10,15 3.8,18.5 5.3,12 0.5,7.6 7.1,7"/></svg>`;
  }
}
