// Demo 3.2: dame loop capture with extra central branching.
//
// Same ring as Demo 3.1, but with an extra black pion on E4 in the centre.
// The central piece creates genuine branches: some sequences capture the outer
// ring only and end on D1, while others weave through E4 and end elsewhere.

import { fileURLToPath } from 'node:url';

import { Board, Game, PieceColor, PieceType, Position } from '../index.js';
import { Repl } from './Repl.js';

export function createDemo32Game(): Game {
  const board = Board.fromPieces([
    [Position.fromString('D1'), { color: PieceColor.WHITE, type: PieceType.DAME }],
    [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E6'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('G6'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('G4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
  ]);
  return new Game(board);
}

export function explainDemo32(): string {
  return `Demo 3.2: dame loop capture with extra central branching.

Same ring as Demo 3.1, but with an extra black pion on E4 in the centre.
The central piece creates genuine branches: some sequences capture only the
outer ring and end on D1, while others weave through E4 and end elsewhere.

  Outer ring loop (ends D1):
    D1 -> C2 -> B3 -> C4 -> D5 -> E6 -> F7 -> G6 -> H5 -> G4 -> F3 -> E2 -> D1

In the REPL, try:
  > d1 d1
The app will ask you to choose because the available D1 -> D1 moves capture
different pieces.
`;
}

async function main(): Promise<void> {
  console.log(explainDemo32());
  await new Repl(undefined, undefined, createDemo32Game()).run();
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
