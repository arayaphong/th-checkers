// Reflects whose turn it is: the active player-card highlight, the polite turn
// announcement (deduplicated so it only speaks on change), and the enabled
// state of the undo/redo controls.
import { PieceColor } from '../../../dist/index.js';

export class StatusView {
  #matchStore;
  #cardP1;
  #cardP2;
  #turnAnnouncement;
  #btnUndo;
  #btnRedo;
  #lastAnnouncedPlayer = null;

  constructor({ matchStore, cardP1, cardP2, turnAnnouncement, btnUndo, btnRedo }) {
    this.#matchStore = matchStore;
    this.#cardP1 = cardP1;
    this.#cardP2 = cardP2;
    this.#turnAnnouncement = turnAnnouncement;
    this.#btnUndo = btnUndo;
    this.#btnRedo = btnRedo;
  }

  // Force the next render to re-announce the current turn (new game).
  resetAnnouncement() {
    this.#lastAnnouncedPlayer = null;
  }

  render({ isAnimating = false } = {}) {
    const current = this.#matchStore.game().player();
    const gameOver = this.#matchStore.isGameOver();

    this.#cardP1.className = `player-card${!gameOver && current === PieceColor.WHITE ? ' active-p1' : ''}`;
    this.#cardP2.className = `player-card${!gameOver && current === PieceColor.BLACK ? ' active-p2' : ''}`;

    if (current !== this.#lastAnnouncedPlayer) {
      this.#lastAnnouncedPlayer = current;
      this.#turnAnnouncement.textContent = gameOver
        ? 'เกมจบแล้ว'
        : `ตาของผู้เล่น ${current === PieceColor.WHITE ? '1' : '2'}`;
    }

    this.#btnUndo.disabled = !this.#matchStore.canUndo() || isAnimating;
    this.#btnRedo.disabled = !this.#matchStore.canRedo() || isAnimating;
  }
}
