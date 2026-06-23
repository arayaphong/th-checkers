import { PieceColor, PieceType } from '../../../dist/index.js';
import { COLS, colorAt } from '../util/coords.js';
import { en } from './messages.en.js';
import { th } from './messages.th.js';

const DEFAULT_LOCALE = 'th';
const catalogs = { en, th };

function messageAt(catalog, key) {
  return key.split('.').reduce((value, part) => value?.[part], catalog);
}

export class I18n {
  #locale;

  constructor(locale = DEFAULT_LOCALE) {
    this.#locale = this.#resolveLocale(locale);
  }

  locale() {
    return this.#locale;
  }

  setLocale(locale) {
    this.#locale = this.#resolveLocale(locale);
  }

  t(key, params = {}) {
    const localized = messageAt(catalogs[this.#locale], key);
    const fallback = messageAt(catalogs[DEFAULT_LOCALE], key);
    const message = localized ?? fallback;
    if (message === undefined) throw new Error(`Missing translation: ${key}`);
    return typeof message === 'function' ? message(params) : message;
  }

  playerLabel(color) {
    return this.t(color === PieceColor.WHITE ? 'players.white' : 'players.black');
  }

  pieceTypeLabel(isDame) {
    return this.t(isDame ? 'pieces.dame' : 'pieces.pion');
  }

  squareLabel({
    r,
    c,
    dark,
    board,
    pos,
    hasLegalMove,
    selectedSquare,
    validMoves,
    currentPlayer,
  }) {
    const coordinate = `${COLS[c]}${r + 1}`;
    if (!dark) {
      return this.t('board.square', {
        coordinate,
        details: this.t('board.unplayable'),
      });
    }

    const selected = selectedSquare?.r === r && selectedSquare?.c === c;
    const legalTarget = validMoves.some((move) => move.r === r && move.c === c);
    const details = [];

    if (board.isOccupied(pos)) {
      const pieceColor = colorAt(board, pos);
      details.push(
        `${this.playerLabel(pieceColor)} ${this.pieceTypeLabel(board.isDamePiece(pos))}`,
      );
      if (pieceColor === currentPlayer && !hasLegalMove) {
        details.push(this.t('board.noLegalMove'));
      }
    } else {
      details.push(this.t('board.empty'));
    }

    if (selected) details.push(this.t('board.selected'));
    if (legalTarget) details.push(this.t('board.legalTarget'));
    return this.t('board.square', { coordinate, details: details.join(', ') });
  }

  capturedSummary(capturer, capturedList) {
    if (capturedList.length === 0) return this.t('stats.noneCaptured', { capturer });

    const owner = this.playerLabel(capturedList[0].color);
    const pionCount = capturedList.filter((piece) => piece.type === PieceType.PION).length;
    const dameCount = capturedList.filter((piece) => piece.type === PieceType.DAME).length;
    const counts = [];
    if (pionCount > 0) {
      counts.push(
        this.t('pieces.count', { type: this.pieceTypeLabel(false), count: pionCount }),
      );
    }
    if (dameCount > 0) {
      counts.push(this.t('pieces.count', { type: this.pieceTypeLabel(true), count: dameCount }));
    }
    return this.t('stats.captured', { capturer, owner, counts });
  }

  localizeDocument(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = this.t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', this.t(element.dataset.i18nTitle));
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', this.t(element.dataset.i18nAriaLabel));
    });
    root.querySelectorAll('[data-i18n-alt]').forEach((element) => {
      element.setAttribute('alt', this.t(element.dataset.i18nAlt));
    });

    const documentElement = root.documentElement;
    if (documentElement) documentElement.lang = this.#locale;
  }

  #resolveLocale(locale) {
    const normalized = String(locale || DEFAULT_LOCALE).toLowerCase().split('-')[0];
    return catalogs[normalized] ? normalized : DEFAULT_LOCALE;
  }
}

export function createI18n(locale) {
  return new I18n(locale);
}

const documentLocale = typeof document === 'undefined' ? DEFAULT_LOCALE : document.documentElement.lang;
export const i18n = createI18n(documentLocale);
