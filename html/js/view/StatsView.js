// Renders each player's captured-pieces tray from the store, with an
// accessible screen-reader summary alongside the visual icons.
import { PieceColor, PieceType } from '../../../dist/index.js';
import { i18n as defaultI18n } from '../i18n/i18n.js';

export class StatsView {
  #p1El;
  #p2El;
  #matchStore;
  #i18n;

  constructor({ matchStore, capturedByP1El, capturedByP2El, i18n = defaultI18n }) {
    this.#matchStore = matchStore;
    this.#p1El = capturedByP1El;
    this.#p2El = capturedByP2El;
    this.#i18n = i18n;
  }

  render() {
    const { capturedByP1, capturedByP2 } = this.#matchStore.capturedPieces();
    this.#p1El.innerHTML = this.#trayMarkup(
      this.#i18n.playerLabel(PieceColor.WHITE),
      capturedByP1,
    );
    this.#p2El.innerHTML = this.#trayMarkup(
      this.#i18n.playerLabel(PieceColor.BLACK),
      capturedByP2,
    );
  }

  #trayMarkup(playerLabel, capturedPieces) {
    const piecesMarkup =
      capturedPieces.length === 0
        ? '<span class="no-captures" aria-hidden="true">—</span>'
        : capturedPieces
            .map((piece) => {
              // Color reflects the captured piece's own color, not the capturer.
              const pieceClass = piece.color === PieceColor.WHITE ? 'p1' : 'p2';
              const isDame = piece.type === PieceType.DAME;
              const dameClass = isDame ? ' dame' : '';
              const crownMarkup = isDame
                ? `<svg width="12" height="11" aria-hidden="true" focusable="false">
                    <use href="svg/crown.svg#icon"></use>
                  </svg>`
                : '';

              return `<span class="cap-piece${dameClass} ${pieceClass}" aria-hidden="true">${crownMarkup}</span>`;
            })
            .join('');

    return `
      <span class="sr-only">${this.#i18n.capturedSummary(playerLabel, capturedPieces)}</span>
      ${piecesMarkup}
    `;
  }
}
