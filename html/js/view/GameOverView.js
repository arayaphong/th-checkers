// The end-of-game modal: renders the winner/result and provides the show/hide
// and focus-trap primitives. Focus saving, background inerting, and the
// handoff with the viewport warning are coordinated by FocusManager.
import { PieceColor } from '../../../dist/index.js';
import { i18n as defaultI18n } from '../i18n/i18n.js';

export class GameOverView {
  #overlay;
  #title;
  #desc;
  #boardEl;
  #i18n;

  constructor(overlay, { titleEl, descEl, boardEl = null, i18n = defaultI18n }) {
    this.#overlay = overlay;
    this.#title = titleEl;
    this.#desc = descEl;
    this.#boardEl = boardEl;
    this.#i18n = i18n;
    this.#hydrateTitle();
  }

  element() {
    return this.#overlay;
  }

  isOpen() {
    return this.#overlay.style.display === 'flex';
  }

  setResult(winnerColor, reason) {
    if (winnerColor === PieceColor.WHITE) {
      this.#renderTitle(
        this.#i18n.t('gameOver.winner', { player: this.#i18n.playerLabel(winnerColor) }),
        {
          iconSrc: 'png/macaw_128px.png',
          iconAlt: this.#i18n.t('players.whiteIcon'),
        },
      );
      this.#title.className = 'game-over-title winner-p1';
    } else {
      this.#renderTitle(
        this.#i18n.t('gameOver.winner', { player: this.#i18n.playerLabel(winnerColor) }),
        {
          iconSrc: 'png/cockatoo_128px.png',
          iconAlt: this.#i18n.t('players.blackIcon'),
        },
      );
      this.#title.className = 'game-over-title winner-p2';
    }
    this.#desc.textContent = reason;
  }

  #renderTitle(text, { iconSrc = null, iconAlt = '', badgeText = null } = {}) {
    this.#title.textContent = '';
    this.#title.setAttribute('aria-label', text);

    const textEl = document.createElement('span');
    textEl.className = 'winner-text';

    const graphemes = this.#segmentText(text);
    graphemes.forEach((grapheme, index) => {
      const letter = document.createElement('span');
      letter.className = 'game-over-letter';
      if (grapheme === ' ') {
        letter.classList.add('winner-space');
        letter.innerHTML = '&nbsp;';
      } else {
        letter.textContent = grapheme;
      }
      letter.style.setProperty('--wave-index', index);
      textEl.appendChild(letter);
    });

    this.#title.appendChild(textEl);

    if (iconSrc) {
      const icon = document.createElement('img');
      icon.src = iconSrc;
      icon.alt = iconAlt;
      icon.className = 'winner-icon';
      this.#title.appendChild(icon);
    } else if (badgeText) {
      const badge = document.createElement('span');
      badge.className = 'winner-badge';
      badge.textContent = badgeText;
      this.#title.appendChild(badge);
    }
  }

  // Re-localize the static title shown before the modal is opened.
  refresh() {
    const text = this.#i18n.t('gameOver.initialTitle');
    const iconAlt = this.#i18n.t('players.whiteIcon');
    this.#title.innerHTML = `
      <span data-i18n="gameOver.initialTitle" class="winner-text">${text}</span>
      <img src="png/macaw_128px.png" alt="${iconAlt}" data-i18n-alt="players.whiteIcon" class="winner-icon">
    `;
    this.#hydrateTitle();
  }

  #segmentText(text) {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      const segmenter = new Intl.Segmenter(this.#i18n.locale(), { granularity: 'grapheme' });
      return [...segmenter.segment(text)].map((segment) => segment.segment);
    }
    return Array.from(text);
  }

  #hydrateTitle() {
    const text =
      this.#title.querySelector('[data-i18n], .winner-text')?.textContent?.trim() ??
      this.#title.childNodes[0]?.textContent?.trim();
    if (!text) return;

    const icon = this.#title.querySelector('.winner-icon');
    if (icon instanceof HTMLImageElement) {
      this.#renderTitle(text, { iconSrc: icon.getAttribute('src'), iconAlt: icon.alt });
      return;
    }

    this.#renderTitle(text);
  }

  open() {
    if (this.#boardEl) {
      const rect = this.#boardEl.getBoundingClientRect();
      const s = this.#overlay.style;
      s.top    = `${rect.top}px`;
      s.left   = `${rect.left}px`;
      s.right  = 'auto';
      s.bottom = 'auto';
      s.width  = `${rect.width}px`;
      s.height = `${rect.height}px`;
    }
    this.#overlay.setAttribute('aria-hidden', 'false');
    this.#overlay.style.display = 'flex';
  }

  close() {
    const s = this.#overlay.style;
    s.display = 'none';
    s.top = s.left = s.right = s.bottom = s.width = s.height = '';
    this.#overlay.setAttribute('aria-hidden', 'true');
  }

  focusFirst() {
    this.#overlay.querySelector('.game-over-modal button').focus();
  }

  // Cycle Tab/Shift+Tab within the modal's enabled buttons.
  trapTab(event) {
    const buttons = [...this.#overlay.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;

    const active = document.activeElement;
    const outside = !this.#overlay.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }
}
