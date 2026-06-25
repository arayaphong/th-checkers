// The interactive REPL loop: render the position, read a line, parse it,
// dispatch the action, repeat. Owns the Game instance and a redo stack so the
// user can step backward and forward through a line in analysis mode.
//
// Input is consumed via readline's async iterator (`for await ... of rl`) rather
// than one-shot `question()` calls. The iterator buffers lines correctly for
// both interactive TTYs and piped/non-TTY input, where queued lines would
// otherwise be dropped between awaits.

import { createInterface, type Interface } from 'node:readline';
import { stdin, stdout } from 'node:process';

import { Game, type Position } from '../index.js';
import { createDemo1Game, explainDemo1 } from './demo1.js';
import { createDemo2Game, explainDemo2 } from './demo2.js';
import { createDemo31Game, explainDemo31 } from './demo31.js';
import { createDemo32Game, explainDemo32 } from './demo32.js';
import { parseInput, type CommandName } from './parse.js';
import { formatMove, formatTrace, renderGame } from './render.js';

const HELP = `Commands:
  <number>          apply the move with that menu number
  <from> <to>       apply a move by coordinates, e.g. "b3 c4" or "b3-c4"
  trace <n>         show the full path of move #n
  trace <f> <t>     show all paths from f to t
  undo  | u         take back the last move
  redo  | r         re-apply a move undone with 'undo'
  new   | reset | n  start a fresh game
  moves | m         re-print the board and move menu
  help  | h | ?     show this help
  quit  | q | exit  exit

Demos (load a preset position):
  demo1             branching chain capture, same final landing
  demo2             dame loop capture ending on the original square
  demo31            dame loop capture with two mirror-image paths
  demo32            dame loop capture with extra central branching`;

export class Repl {
  #game: Game;
  /** Move indices that were undone, newest last; consumed by 'redo'. */
  #redoStack: number[] = [];
  /** When set, the next input line picks among these move indices (disambiguation). */
  #pendingPick: number[] | null = null;
  #rl: Interface;
  #output: NodeJS.WritableStream;

  constructor(input: NodeJS.ReadableStream = stdin, output: NodeJS.WritableStream = stdout, game?: Game) {
    this.#rl = createInterface({ input, output });
    this.#output = output;
    this.#game = game ?? new Game();
  }

  async run(): Promise<void> {
    this.#rl.on('SIGINT', () => this.#rl.close());
    this.#print(renderGame(this.#game));
    this.#writePrompt();

    try {
      for await (const raw of this.#rl) {
        const done = this.#handleLine(raw);
        if (done) break;
        this.#writePrompt();
      }
    } finally {
      this.#rl.close();
    }
    this.#print('\nBye.');
  }

  /** Process one input line. Returns true if the loop should exit. */
  #handleLine(raw: string): boolean {
    if (this.#pendingPick) {
      this.#resolvePick(raw);
      return false;
    }

    const parsed = parseInput(raw);
    switch (parsed.kind) {
      case 'empty':
        this.#print(renderGame(this.#game));
        return false;
      case 'command':
        if (parsed.name === 'quit') return true;
        this.#runCommand(parsed.name);
        return false;
      case 'index':
        this.#applyIndex(parsed.value);
        return false;
      case 'coords':
        this.#applyCoords(parsed.from, parsed.to);
        return false;
      case 'trace-index':
        this.#traceIndex(parsed.index);
        return false;
      case 'trace-coords':
        this.#traceCoords(parsed.from, parsed.to);
        return false;
      case 'error':
        this.#print(parsed.message);
        return false;
    }
  }

  #runCommand(name: CommandName): void {
    switch (name) {
      case 'help':
        this.#print(HELP);
        break;
      case 'moves':
        this.#print(renderGame(this.#game));
        break;
      case 'undo':
        this.#undo();
        break;
      case 'redo':
        this.#redo();
        break;
      case 'new':
        this.#game = new Game();
        this.#redoStack = [];
        this.#print(renderGame(this.#game));
        break;
      case 'demo1':
        this.#game = createDemo1Game();
        this.#redoStack = [];
        this.#print(explainDemo1());
        this.#print(renderGame(this.#game));
        break;
      case 'demo2':
        this.#game = createDemo2Game();
        this.#redoStack = [];
        this.#print(explainDemo2());
        this.#print(renderGame(this.#game));
        break;
      case 'demo31':
        this.#game = createDemo31Game();
        this.#redoStack = [];
        this.#print(explainDemo31());
        this.#print(renderGame(this.#game));
        break;
      case 'demo32':
        this.#game = createDemo32Game();
        this.#redoStack = [];
        this.#print(explainDemo32());
        this.#print(renderGame(this.#game));
        break;
      case 'quit':
        break; // handled in #handleLine
    }
  }

  #applyIndex(value: number): void {
    const moves = this.#game.getMoves();
    if (value > moves.length) {
      this.#print(`No move #${value}. There are ${moves.length} legal move(s).`);
      return;
    }
    this.#commitMove(value - 1);
  }

  #applyCoords(from: Position, to: Position): void {
    const moves = this.#game.getMoves();
    const matches: number[] = [];
    moves.forEach((m, i) => {
      if (m.from.equals(from) && m.to.equals(to)) matches.push(i);
    });

    if (matches.length === 0) {
      this.#print(`No legal move from ${from.toString()} to ${to.toString()}.`);
      return;
    }
    if (matches.length === 1) {
      this.#commitMove(matches[0]);
      return;
    }

    // If every match captures the same pieces, the path order does not affect
    // the outcome; auto-pick the first one instead of asking.
    const capturedKey = (idx: number): string =>
      moves[idx].captured.map(p => p.hash()).sort((a, b) => a - b).join(',');
    const firstKey = capturedKey(matches[0]);
    if (matches.every(idx => capturedKey(idx) === firstKey)) {
      this.#commitMove(matches[0]);
      return;
    }

    // Same from/to but different captured sets → ask the user to disambiguate.
    this.#print(`Multiple moves match ${from.toString()} -> ${to.toString()}:`);
    matches.forEach((idx, n) => this.#print(`  ${n + 1}) ${formatMove(moves[idx])}`));
    this.#pendingPick = matches;
  }

  #traceIndex(value: number): void {
    const moves = this.#game.getMoves();
    if (value < 1 || value > moves.length) {
      this.#print(`No move #${value}. There are ${moves.length} legal move(s).`);
      return;
    }
    this.#print(formatTrace(moves[value - 1]));
  }

  #traceCoords(from: Position, to: Position): void {
    const moves = this.#game.getMoves();
    const matches = moves.filter(m => m.from.equals(from) && m.to.equals(to));

    if (matches.length === 0) {
      this.#print(`No legal move from ${from.toString()} to ${to.toString()}.`);
      return;
    }

    this.#print(`Trace(s) for ${from.toString()} -> ${to.toString()}:`);
    matches.forEach((m, i) => {
      this.#print(`  ${i + 1}) ${formatTrace(m)}`);
    });
  }

  /** Resolve a pending disambiguation pick from the user's input line. */
  #resolvePick(raw: string): void {
    const matches = this.#pendingPick!;
    this.#pendingPick = null;
    const choice = Number(raw.trim());
    if (!Number.isInteger(choice) || choice < 1 || choice > matches.length) {
      this.#print('Cancelled.');
      return;
    }
    this.#commitMove(matches[choice - 1]);
  }

  /** Apply a move by its index into the current move list; resets redo. */
  #commitMove(index: number): void {
    try {
      this.#game.selectMove(index);
      this.#redoStack = [];
      this.#print(renderGame(this.#game));
    } catch (err) {
      this.#print(`Could not apply move: ${(err as Error).message}`);
    }
  }

  #undo(): void {
    const sequence = this.#game.getMoveSequence();
    if (sequence.length === 0) {
      this.#print('Nothing to undo.');
      return;
    }
    this.#redoStack.push(sequence[sequence.length - 1]);
    this.#game.undoMove();
    this.#print(renderGame(this.#game));
  }

  #redo(): void {
    const index = this.#redoStack.pop();
    if (index === undefined) {
      this.#print('Nothing to redo.');
      return;
    }
    try {
      this.#game.selectMove(index);
      this.#print(renderGame(this.#game));
    } catch (err) {
      this.#print(`Could not redo: ${(err as Error).message}`);
    }
  }

  #writePrompt(): void {
    this.#output.write(this.#pendingPick ? 'Pick a number: ' : '\n> ');
  }

  #print(text: string): void {
    this.#output.write(`${text}\n`);
  }
}
