# th-checkers

Thai checkers game logic implemented in TypeScript.

## Project Layout

- `src/`: source modules for board state, pieces, legal moves, game flow, and search/exploration.
- `tests/`: Jest test suites for game behavior and move selection.
- `dist/`: generated build output from TypeScript. It is ignored by git.

## Requirements

- Node.js
- npm

## Setup

```sh
npm install
```

## Commands

```sh
npm run build
npm test
```

`npm run build` compiles TypeScript into `dist/`. `npm test` runs the Jest suite through `ts-jest` in ESM mode.

## Usage

Import from the package entry point after building:

```ts
import { Board, Game } from 'th-checkers';

const game = new Game(Board.setup());
```

## Repository

GitHub: <https://github.com/arayaphong/th-checkers>
