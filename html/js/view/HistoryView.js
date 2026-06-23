// Renders the move-history list from the store, including accessible per-move
// summaries, and keeps the current move scrolled into view.
import { PieceColor } from '../../../dist/index.js';
import { i18n as defaultI18n } from '../i18n/i18n.js';

export class HistoryView {
  #listEl;
  #matchStore;
  #i18n;

  constructor(listEl, { matchStore, i18n = defaultI18n }) {
    this.#listEl = listEl;
    this.#matchStore = matchStore;
    this.#i18n = i18n;
  }

  render() {
    const fragment = document.createDocumentFragment();
    let currentEntryEl = null;
    for (const historyEntry of this.#matchStore.historyEntries()) {
      const entryEl = this.#renderEntry(historyEntry);
      fragment.appendChild(entryEl);
      if (historyEntry.isCurrent) currentEntryEl = entryEl;
    }

    this.#listEl.replaceChildren(fragment);
    this.#scrollToCurrent(currentEntryEl);
  }

  #renderEntry({ index, move, mover, promoted, isCurrent, isFuture }) {
    const { playerLabel, playerClass } = this.#playerDetails(mover);
    const from = move.from.toString();
    const to = move.to.toString();
    const captureCount = move.captured.length;
    const moveText = `${from}${captureCount > 0 ? 'x' : '→'}${to}`;
    const details = [
      captureCount > 0 && this.#i18n.t('history.capture', { count: captureCount }),
      promoted && this.#i18n.t('history.promotion'),
      isCurrent && this.#i18n.t('history.current'),
    ]
      .filter(Boolean)
      .map((detail) => `, ${detail}`)
      .join('');
    const accessibleText = this.#i18n.t('history.entry', {
      index,
      player: playerLabel,
      from,
      to,
      details,
    });

    const entry = document.createElement('div');
    entry.className = [
      'history-entry',
      isCurrent && 'current',
      isFuture && 'future',
      captureCount > 0 && 'capture',
    ]
      .filter(Boolean)
      .join(' ');
    entry.setAttribute('role', 'listitem');
    if (isCurrent) entry.setAttribute('aria-current', 'step');

    entry.innerHTML = this.#entryMarkup({
      index,
      playerClass,
      moveText,
      accessibleText,
      captureCount,
      promoted,
    });
    return entry;
  }

  #playerDetails(mover) {
    return mover === PieceColor.WHITE
      ? { playerLabel: this.#i18n.playerLabel(mover), playerClass: 'p1' }
      : { playerLabel: this.#i18n.playerLabel(mover), playerClass: 'p2' };
  }

  #entryMarkup({ index, playerClass, moveText, accessibleText, captureCount, promoted }) {
    const captureCountMarkup =
      captureCount > 1 ? `<span class="cap-count">×${captureCount}</span>` : '';
    const captureBadge =
      captureCount > 0
        ? `<span class="h-capture" aria-hidden="true" title="${this.#i18n.t('history.captureTitle', { count: captureCount })}">
            <svg width="12" height="12" aria-hidden="true" focusable="false">
              <use href="svg/capture.svg#icon"></use>
            </svg>
            ${captureCountMarkup}
          </span>`
      : '';
    const promotionBadge = promoted
      ? `<span class="h-promotion ${playerClass}" aria-hidden="true" title="${this.#i18n.t('history.promotion')}">
          <svg width="12" height="11" aria-hidden="true" focusable="false">
            <use href="svg/crown.svg#icon"></use>
          </svg>
        </span>`
      : '';
    const flags =
      captureBadge || promotionBadge
        ? `<span class="h-flags">${captureBadge}${promotionBadge}</span>`
        : '';

    return `
      <span class="sr-only">${accessibleText}</span>
      <span class="h-num" aria-hidden="true">${index}.</span>
      <span class="h-dot ${playerClass}" aria-hidden="true"></span>
      <span class="h-move" aria-hidden="true">${moveText}</span>
      ${flags}
    `;
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
}
