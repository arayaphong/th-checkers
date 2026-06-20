// Renders the move-history list from the store, including accessible per-move
// summaries, and keeps the current move scrolled into view.
import { PieceColor } from '../../../dist/index.js';

export class HistoryView {
  #listEl;
  #matchStore;

  constructor(listEl, { matchStore }) {
    this.#listEl = listEl;
    this.#matchStore = matchStore;
  }

  render() {
    this.#listEl.innerHTML = '';
    let currentEntryEl = null;
    for (const { index: i, move, mover, isCurrent } of this.#matchStore.historyEntries()) {
      const entry = this.#renderEntry(i, move, mover, isCurrent);
      this.#listEl.appendChild(entry);
      if (isCurrent) currentEntryEl = entry;
    }
    this.#scrollToCurrent(currentEntryEl);
  }

  #renderEntry(i, move, mover, isCurrent) {
    const playerLabel = mover === PieceColor.WHITE ? 'ผู้เล่น 1' : 'ผู้เล่น 2';
    const dotClass = mover === PieceColor.WHITE ? 'p1' : 'p2';
    const sep = move.captured.length > 0 ? 'x' : '→';
    const text = `${move.from.toString()}${sep}${move.to.toString()}`;
    const captureText = move.captured.length > 0 ? `, กินหมาก ${move.captured.length} ตัว` : '';
    const currentText = isCurrent ? ', ตำแหน่งปัจจุบัน' : '';
    const accessibleText = `ตาที่ ${i}, ${playerLabel}, เดินจาก ${move.from.toString()} ไป ${move.to.toString()}${captureText}${currentText}`;

    const entry = document.createElement('div');
    entry.className = `history-entry${isCurrent ? ' current' : ''}${move.captured.length > 0 ? ' capture' : ''}`;
    entry.setAttribute('role', 'listitem');
    if (isCurrent) entry.setAttribute('aria-current', 'step');
    entry.innerHTML = `
      <span class="sr-only">${accessibleText}</span>
      <span class="h-num" aria-hidden="true">${i}.</span>
      <span class="h-dot ${dotClass}" aria-hidden="true"></span>
      <span class="h-move" aria-hidden="true">${text}</span>
      ${
        move.captured.length > 0
          ? `<span class="h-capture" aria-hidden="true" title="กินหมาก${move.captured.length > 1 ? ` ${move.captured.length} ตัว` : ''}">${this.#captureIcon()}${move.captured.length > 1 ? `<span class="cap-count">×${move.captured.length}</span>` : ''}</span>`
          : ''
      }
    `;
    return entry;
  }

  #scrollToCurrent(currentEntryEl) {
    const list = this.#listEl;
    if (currentEntryEl) {
      const top = currentEntryEl.offsetTop;
      const bottom = top + currentEntryEl.offsetHeight;
      if (top < list.scrollTop) {
        list.scrollTop = top - 4;
      } else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom - list.clientHeight + 4;
      }
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }

  #captureIcon() {
    return `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true" focusable="false"><use href="svg/capture.svg#icon"></use></svg>`;
  }
}
