# Repository Guidelines

## Project Structure & Module Organization

This is a small TypeScript library for Thai checkers game logic. Source files live in `src/core/`, with one main class or concept per module: `Board.ts`, `Game.ts`, `Explorer.ts`, `Legals.ts` (also exports `CaptureTrace` and `MoveInfo`), `Piece.ts`, and `Position.ts`. The interactive REPL and demo scenarios live in `src/app/`. Jest tests live in `tests/core/` and `tests/app/` and use `*.test.ts` names. Build output is emitted to `dist/`; treat it as generated from `src/`.

## Build, Test, and Development Commands

- `npm install`: installs TypeScript, Jest, `ts-jest`, and type definitions.
- `npm run build`: runs `tsc`, type-checks `src/`, and writes compiled files, declarations, and source maps to `dist/`.
- `npm test`: runs Jest in ESM mode against `tests/**/*.test.ts`.
- `npm run repl` / `npm run demo`: starts the interactive REPL with a standard board.
- `npm run demo:branching-capture`: starts the REPL pre-loaded with a branching-capture position.
- `npm run demo:loop-capture`: starts the REPL pre-loaded with a dame loop-capture position.
- Inside the REPL, `trace <number>` or `trace <from> <to>` prints the full intermediate path of a move.

There is no local dev server; development is edit, build, and test.

## Coding Style & Naming Conventions

Use TypeScript ES modules and include `.js` extensions in relative imports, matching the existing `ts-jest` ESM setup. Keep `strict` TypeScript compatibility. Use two-space indentation, single quotes, semicolons, and descriptive names. Classes and enum-like exports use PascalCase (`Board`, `PieceColor`); functions, methods, and variables use camelCase (`fromPieces`, `moveCount`). Prefer focused modules and avoid unrelated refactors when changing game rules.

## Testing Guidelines

Tests use Jest with `ts-jest/presets/default-esm`. Place new tests under `tests/core/` for game logic or `tests/app/` for REPL behavior, using `Feature.test.ts` names, and group behavior with `describe(...)` blocks. Cover board encoding/decoding, move legality, turn changes, captures, promotion, and undo behavior when touched. Add parser/render tests when changing REPL input or output. Run `npm test` before submitting changes; run `npm run build` when changing exported APIs or TypeScript configuration.

## Commit & Pull Request Guidelines

Git history is not accessible in this checkout, so use clear, imperative commit subjects such as `Add forced capture tests` or `Fix dame move generation`. Keep each commit focused on one behavior change.

Pull requests should include a short summary, test results (`npm test`, `npm run build`), and any rule or API behavior changes. Link related issues when available. Screenshots are not needed unless a future UI is added.

## Agent-Specific Instructions

Do not edit `dist/` by hand; update `src/core/` and rebuild. Preserve public exports and existing ESM import style unless the package configuration changes too.

`Board.encode()` is intentionally compact for Thai checkers: valid boards contain at most 16 pieces total, so 32 occupancy bits plus 16 color bits and 16 type bits are sufficient. Do not treat the 64-bit layout as lossy unless code starts supporting non-game boards with more than 16 pieces.

## CaptureTrace

`CaptureTrace` (exported from `Legals.ts`) is a standalone immutable object that preserves the full capture path through a multi-jump sequence. It is separate from `Move.captured` so the flat captured-pieces list stays backward compatible.

- `trace.sequence` — `[captured₁, landing₁, …, finalLanding]` — the raw alternating sequence
- `trace.captured` — just the captured pieces (even indices)
- `trace.path(from)` — `[from, landing₁, …, finalLanding]` — the piece's travel path
- `trace.length` — number of captures
- `trace.finalLanding` — last element (same as `move.to`)
- `trace.toString()` — human-readable, e.g. `"×C6 →D5 ×E4 →F3"`

The trace is threaded from `Explorer` → `Legals` (`captureSequence` in `MoveInfo`) → `Game.#toMove()` → `Move.trace`. `copyMoveInfo` and `copyMove` preserve it through defensive copies. Tests cover construction, immutability, path computation, `toString`, and integration with `Game.getMoves()` / `Game.copy()`.
