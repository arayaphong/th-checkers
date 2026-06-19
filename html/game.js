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

// Model and transient UI state. The match store emits `match:changed` on the bus.
const bus = new EventBus();
const matchStore = new MatchStore(bus);
const selectionStore = new SelectionStore();
const viewportStore = new ViewportStore();

// Services: audio plays on `sound:play`, the animator runs FLIP moves.
const audioService = new AudioService(bus);
audioService.start();
const animator = new Animator();

// The controller is late-bound so the board can forward activations to it.
// eslint-disable-next-line prefer-const
let controller;

const boardView = new BoardView(document.getElementById('board'), {
  matchStore,
  onActivate: (r, c) => controller.activateSquare(r, c),
});
const historyView = new HistoryView(document.getElementById('history-list'), { matchStore });
const statsView = new StatsView({
  matchStore,
  capturedByP1El: document.getElementById('captured-by-p1'),
  capturedByP2El: document.getElementById('captured-by-p2'),
});
const statusView = new StatusView({
  matchStore,
  cardP1: document.getElementById('card-p1'),
  cardP2: document.getElementById('card-p2'),
  turnAnnouncement: document.getElementById('turn-announcement'),
  btnUndo: document.getElementById('btn-undo'),
  btnRedo: document.getElementById('btn-redo'),
});

// Overlays and the focus/inert coordination that ties them together.
const gameOverView = new GameOverView(document.getElementById('game-over-overlay'), {
  titleEl: document.getElementById('winner-title'),
  descEl: document.getElementById('winner-desc'),
});
const viewportView = new ViewportView(document.getElementById('too-small-overlay'));
const focusManager = new FocusManager({
  section: document.querySelector('section'),
  gameOverView,
  viewportView,
  viewportStore,
  onFocusBoard: () => boardView.focusCurrent(),
});

const starfield = new Starfield(document.getElementById('stars-bg'));

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
  controls: {
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),
    btnReset: document.getElementById('btn-reset'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnReview: document.getElementById('btn-review-game'),
  },
});
controller.start();

window.addEventListener('resize', () => focusManager.checkSize());

window.addEventListener('load', () => {
  controller.newGame();
  focusManager.checkSize();
  starfield.render();
});
