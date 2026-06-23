# th-checkers

Thai checkers game logic implemented in TypeScript.

## Project Layout

- `src/core/`: source modules for board state, pieces, legal moves, game flow, and search/exploration.
- `tests/core/`: Jest test suites for game behavior and move selection.
- `tests/html/`: jsdom workflow tests for the browser client.
- `tests/e2e/`: Playwright Chromium workflow and local static test server.
- `dist/`: generated build output from TypeScript. It is ignored by git.

## Requirements

- Node.js
- npm

## Setup

```sh
npm install
npx playwright install chromium
```

## Commands

```sh
npm run build
npm test
npm run test:dom
npm run test:e2e
npm run test:all
```

`npm run build` compiles TypeScript into `dist/`. `npm test` runs all Jest suites through `ts-jest` in ESM mode. `npm run test:dom` runs only the jsdom browser-client workflows. `npm run test:e2e` builds the project and runs the real Chromium workflow. `npm run test:all` runs both Jest and Playwright coverage.

## Usage

Import from the package entry point after building:

```ts
import { Board, Game, Position, PieceColor, PieceType, CaptureTrace } from 'th-checkers';

const game = new Game(Board.setup());
```

### Moves & Capture Traces

`Game.getMoves()` returns `readonly Move[]` without executing anything:

```ts
interface Move {
  from: Position;          // starting square
  to: Position;            // final landing square
  captured: Position[];    // flat list of captured pieces (backward compatible)
  trace?: CaptureTrace;    // full capture path, present only for capture moves
}
```

For non-capture moves, `trace` is `undefined` and `captured` is empty. For capture moves, `trace` provides the complete path:

```ts
const moves = game.getMoves();
const capture = moves.find(m => m.trace);

// CaptureTrace properties
capture.trace.sequence;    // [captured₁, landing₁, captured₂, landing₂, …, finalLanding]
capture.trace.captured;    // [captured₁, captured₂, …] — just the taken pieces
capture.trace.path(from);  // [from, landing₁, landing₂, …, finalLanding] — travel path
capture.trace.length;      // number of captures (sequence.length / 2)
capture.trace.finalLanding; // same as move.to
capture.trace.toString();  // "×C6 →D5 ×E4 →F3 ×G2 →H1"
```

The trace is computed during move generation — no move needs to be executed to inspect it. `Move.captured` remains unchanged as the flat list for backward compatibility.

## Board Encoding

Thai checkers uses 8 pieces per side, so a valid board has at most 16 pieces. `Board.encode()` intentionally fits valid boards into 64 bits: 32 bits for occupied playable squares, 16 bits for piece color, and 16 bits for piece type. The color/type bits are stored in occupied-square scan order, not by absolute board square. `Board.fromPieces()` and `Board.decode()` reject boards with more than 16 occupied squares.

## Piece Maps

`Board.getPieces(color)` returns `Map<number, PieceInfo>`, keyed by `Position.hash()` rather than `Position` object identity. Use `Position.fromIndex(index)` when iterating if you need coordinates. `Board.fromPieces()` accepts either stable numeric keys or `Position` keys and rejects duplicate logical squares.

## Repository

GitHub: <https://github.com/arayaphong/th-checkers>
