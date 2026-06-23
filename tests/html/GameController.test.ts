/** @jest-environment jsdom */

import { beforeAll, describe, expect, test } from '@jest/globals';

// @ts-ignore - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';
// @ts-ignore - browser model is plain JavaScript
import { MatchStore } from '../../html/js/model/MatchStore.js';
// @ts-ignore - browser model is plain JavaScript
import { SelectionStore } from '../../html/js/model/SelectionStore.js';
// @ts-ignore - browser model is plain JavaScript
import { ViewportStore } from '../../html/js/model/ViewportStore.js';
// @ts-ignore - browser service is plain JavaScript
import { Animator } from '../../html/js/service/Animator.js';
// @ts-ignore - browser service is plain JavaScript
import { FocusManager } from '../../html/js/service/FocusManager.js';
// @ts-ignore - browser view is plain JavaScript
import { BoardView } from '../../html/js/view/BoardView.js';
// @ts-ignore - browser view is plain JavaScript
import { HistoryView } from '../../html/js/view/HistoryView.js';
// @ts-ignore - browser view is plain JavaScript
import { StatsView } from '../../html/js/view/StatsView.js';
// @ts-ignore - browser view is plain JavaScript
import { StatusView } from '../../html/js/view/StatusView.js';
// @ts-ignore - browser view is plain JavaScript
import { GameOverView } from '../../html/js/view/GameOverView.js';
// @ts-ignore - browser view is plain JavaScript
import { ViewportView } from '../../html/js/view/ViewportView.js';
// @ts-ignore - browser controller is plain JavaScript
import { GameController } from '../../html/js/controller/GameController.js';
// @ts-ignore - browser util is plain JavaScript
import { posToHtml } from '../../html/js/util/coords.js';

function harness() {
  document.body.innerHTML = `
    <section></section>
    <div id="board"></div>
    <div id="history-list"></div>
    <div id="captured-by-p1"></div>
    <div id="captured-by-p2"></div>
    <div id="card-p1"></div>
    <div id="card-p2"></div>
    <div id="turn-announcement"></div>
    <button id="btn-undo"></button>
    <button id="btn-redo"></button>
    <button id="btn-reset"></button>
    <button id="btn-play-again"></button>
    <button id="btn-review-game"></button>
    <div id="game-over-overlay" style="display:none">
      <div class="game-over-modal">
        <h2 id="winner-title"></h2>
        <p id="winner-desc"></p>
        <button>ok</button>
      </div>
    </div>
    <div id="too-small-overlay" tabindex="-1" style="display:none"></div>
  `;

  const bus = new EventBus();
  const matchStore = new MatchStore(bus);
  const selectionStore = new SelectionStore();
  const get = (id: string) => document.getElementById(id);

  const boardView = new BoardView(get('board'), {
    matchStore,
    onActivate: (r: number, c: number) => controller.activateSquare(r, c),
  });
  const gameOverView = new GameOverView(get('game-over-overlay'), {
    titleEl: get('winner-title'),
    descEl: get('winner-desc'),
  });
  const focusManager = new FocusManager({
    section: document.querySelector('section'),
    gameOverView,
    viewportView: new ViewportView(get('too-small-overlay')),
    viewportStore: new ViewportStore(),
    onFocusBoard: () => boardView.focusCurrent(),
  });

  const controller = new GameController({
    bus,
    matchStore,
    selectionStore,
    animator: new Animator(),
    boardView,
    historyView: new HistoryView(get('history-list'), { matchStore }),
    statsView: new StatsView({
      matchStore,
      capturedByP1El: get('captured-by-p1'),
      capturedByP2El: get('captured-by-p2'),
    }),
    statusView: new StatusView({
      matchStore,
      cardP1: get('card-p1'),
      cardP2: get('card-p2'),
      turnAnnouncement: get('turn-announcement'),
      btnUndo: get('btn-undo'),
      btnRedo: get('btn-redo'),
    }),
    gameOverView,
    focusManager,
    controls: {
      btnUndo: get('btn-undo'),
      btnRedo: get('btn-redo'),
      btnReset: get('btn-reset'),
      btnPlayAgain: get('btn-play-again'),
      btnReview: get('btn-review-game'),
    },
  });

  controller.start();
  return { controller, matchStore };
}

function firstMoveCoords(matchStore: any) {
  const move = matchStore.game().getMoves()[0];
  return { from: posToHtml(move.from), to: posToHtml(move.to) };
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: true }), // reduced motion -> synchronous moves
  });
});

describe('GameController', () => {
  test('newGame renders the opening position with movable pieces', () => {
    const { controller } = harness();
    controller.newGame();
    expect(document.querySelectorAll('.square')).toHaveLength(64);
    expect(document.querySelector('.piece.movable')).not.toBeNull();
    expect(document.querySelectorAll('.history-entry')).toHaveLength(0);
  });

  test('selecting a piece marks its legal targets', () => {
    const { controller, matchStore } = harness();
    controller.newGame();
    const { from, to } = firstMoveCoords(matchStore);

    controller.activateSquare(from.r, from.c);
    expect(
      document
        .querySelector(`.square[data-r="${from.r}"][data-c="${from.c}"]`)!
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      document
        .querySelector(`.square[data-r="${to.r}"][data-c="${to.c}"]`)!
        .classList.contains('valid-move'),
    ).toBe(true);
  });

  test('playing a move commits it and undo reverts it', () => {
    const { controller, matchStore } = harness();
    controller.newGame();
    const { from, to } = firstMoveCoords(matchStore);

    controller.activateSquare(from.r, from.c);
    controller.activateSquare(to.r, to.c);
    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
    expect((document.getElementById('btn-undo') as HTMLButtonElement).disabled).toBe(false);

    document.getElementById('btn-undo')!.click();
    expect(document.querySelectorAll('.history-entry')).toHaveLength(1);
    expect(document.querySelectorAll('.history-entry.future')).toHaveLength(1);
    expect((document.getElementById('btn-redo') as HTMLButtonElement).disabled).toBe(false);
  });
});
