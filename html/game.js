// Composition root: construct the model, services, views, and controller, wire
// them together, and bootstrap the game on load. All behavior lives in the
// collaborators below; this file only assembles them.
import { EventBus } from './js/core/EventBus.js';
import { MatchStore } from './js/model/MatchStore.js';
import { SelectionStore } from './js/model/SelectionStore.js';
import { ViewportStore } from './js/model/ViewportStore.js';
import { AudioService } from './js/service/AudioService.js';
import { Animator } from './js/service/Animator.js';
import { Starfield } from './js/service/Starfield.js';
import { FocusManager } from './js/service/FocusManager.js';
import { BoardView } from './js/view/BoardView.js';
import { HistoryView } from './js/view/HistoryView.js';
import { StatsView } from './js/view/StatsView.js';
import { StatusView } from './js/view/StatusView.js';
import { GameOverView } from './js/view/GameOverView.js';
import { ViewportView } from './js/view/ViewportView.js';
import { GameController } from './js/controller/GameController.js';
import { Events } from './js/core/events.js';
import { i18n } from './js/i18n/i18n.js';

const requestedLocale = new window.URLSearchParams(window.location.search).get('lang');
const savedLocale =
  typeof localStorage !== 'undefined' ? localStorage.getItem('th-checkers-lang') : null;
if (requestedLocale) {
  i18n.setLocale(requestedLocale);
} else if (savedLocale) {
  i18n.setLocale(savedLocale);
}
i18n.localizeDocument();

// Model and transient UI state. The match store emits `match:changed` on the bus.
const bus = new EventBus();
const matchStore = new MatchStore(bus);
const selectionStore = new SelectionStore();
const viewportStore = new ViewportStore();

// Services: audio plays on `sound:play`, the animator runs FLIP moves.
const audioService = new AudioService(bus);
audioService.start();
audioService.loadMutedPreference();
const animator = new Animator();

// The controller is late-bound so the board can forward activations to it.
// eslint-disable-next-line prefer-const
let controller;

const boardView = new BoardView(document.getElementById('board'), {
  matchStore,
  onActivate: (r, c) => controller.activateSquare(r, c),
  i18n,
});
const historyView = new HistoryView(document.getElementById('history-list'), { matchStore, i18n });
const statsView = new StatsView({
  matchStore,
  capturedByP1El: document.getElementById('captured-by-p1'),
  capturedByP2El: document.getElementById('captured-by-p2'),
  i18n,
});
const statusView = new StatusView({
  matchStore,
  cardP1: document.getElementById('card-p1'),
  cardP2: document.getElementById('card-p2'),
  turnAnnouncement: document.getElementById('turn-announcement'),
  btnUndo: document.getElementById('btn-undo'),
  btnRedo: document.getElementById('btn-redo'),
  i18n,
});

// Overlays and the focus/inert coordination that ties them together.
const gameOverView = new GameOverView(document.getElementById('game-over-overlay'), {
  titleEl: document.getElementById('winner-title'),
  descEl: document.getElementById('winner-desc'),
  boardEl: document.querySelector('.board-wrapper'),
  i18n,
});
const viewportView = new ViewportView(document.getElementById('too-small-overlay'));
const focusManager = new FocusManager({
  section: document.querySelector('section'),
  gameOverView,
  viewportView,
  viewportStore,
  onFocusBoard: () => boardView.focusCurrent(),
});

const starfield = new Starfield(document.getElementById('stars-bg'), { fireworkCount: 0 });
const gameOverFireworks = new Starfield(document.getElementById('game-over-fireworks'), {
  count: 0,
  fireworkCount: 5,
  sparkCount: 12,
});

controller = new GameController({
  bus,
  matchStore,
  selectionStore,
  animator,
  boardView,
  historyView,
  statsView,
  statusView,
  gameOverView,
  focusManager,
  i18n,
  controls: {
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),
    btnReset: document.getElementById('btn-reset'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnReview: document.getElementById('btn-review-game'),
  },
});
controller.start();

const btnSound = document.getElementById('btn-sound');
const btnLanguage = document.getElementById('btn-language');

function updateSoundButton() {
  if (!btnSound) return;
  const muted = audioService.isMuted();
  btnSound.textContent = muted ? '🔇' : '🔊';
  const titleKey = muted ? 'app.controls.soundOn' : 'app.controls.soundOff';
  btnSound.dataset.i18nTitle = titleKey;
  const title = i18n.t(titleKey);
  btnSound.title = title;
  btnSound.setAttribute('aria-label', title);
}

function updateLanguageButton() {
  if (!btnLanguage) return;
  const nextLocale = i18n.locale() === 'th' ? 'en' : 'th';
  btnLanguage.textContent = nextLocale.toUpperCase();
  const title = i18n.t('app.controls.language');
  btnLanguage.title = title;
  btnLanguage.setAttribute('aria-label', `${title} (${nextLocale.toUpperCase()})`);
}

updateSoundButton();
updateLanguageButton();

btnSound?.addEventListener('click', () => {
  audioService.toggleMuted();
  updateSoundButton();
});

btnLanguage?.addEventListener('click', () => {
  const nextLocale = i18n.locale() === 'th' ? 'en' : 'th';
  i18n.setLocale(nextLocale);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('th-checkers-lang', nextLocale);
    } catch {
      // Storage is optional.
    }
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', nextLocale);
    window.history.replaceState({}, '', url);
  } catch {
    // URL updates are optional.
  }
  i18n.localizeDocument();
  controller.refresh();
  updateSoundButton();
  updateLanguageButton();
});

window.addEventListener('resize', () => focusManager.checkSize());

window.addEventListener('load', () => {
  bus.emit(Events.MATCH_CHANGED, { store: matchStore });
  focusManager.checkSize();
  starfield.render();
  gameOverFireworks.render();
});
