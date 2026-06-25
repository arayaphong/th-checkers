/** @jest-environment jsdom */

import { describe, expect, test } from '@jest/globals';

import { PieceColor, PieceType, Position } from '../../dist/index.js';
// @ts-ignore - browser service is plain JavaScript
import { StateLoader, StateLoaderError } from '../../html/js/service/StateLoader.js';

function loader() {
  return new StateLoader();
}

function fileFromText(text: string) {
  return {
    text: () => Promise.resolve(text),
    type: 'application/json',
    size: text.length,
    name: 'test.json',
  };
}

describe('StateLoader', () => {
  test('loads a valid position from a Blob', async () => {
    const { game } = await loader().load(fileFromText(JSON.stringify({
      version: 1,
      pieces: {
        D5: { color: 'white', type: 'pion' },
        C4: { color: 'black', type: 'pion' },
      },
    })));

    const board = game.board();
    expect(board.getPieces(PieceColor.WHITE).size).toBe(1);
    expect(board.getPieces(PieceColor.BLACK).size).toBe(1);
  });

  test('loads a valid position from a plain object', () => {
    const { board } = loader().loadFromObject({
      version: 1,
      pieces: {
        D5: { color: 'white', type: 'pion' },
        C4: { color: 'black', type: 'dame' },
      },
    });

    expect(board.getPieces(PieceColor.WHITE).size).toBe(1);
    expect(board.getPieces(PieceColor.BLACK).size).toBe(1);
    expect(board.isDamePiece(Position.fromString('C4'))).toBe(true);
    expect(board.isDamePiece(Position.fromString('D5'))).toBe(false);
  });

  test('empty pieces produces an empty-board game', () => {
    const { game } = loader().loadFromObject({ version: 1, pieces: {} });
    expect(game.board().getPieces(PieceColor.WHITE).size).toBe(0);
    expect(game.board().getPieces(PieceColor.BLACK).size).toBe(0);
  });

  test('rejects non-JSON', async () => {
    await expect(loader().load(fileFromText('not json'))).rejects.toBeInstanceOf(StateLoaderError);
  });

  test('rejects unsupported version', async () => {
    await expect(loader().load(fileFromText(JSON.stringify({ version: 2, pieces: {} }))))
      .rejects.toThrow('Unsupported file version');
  });

  test('rejects missing pieces', async () => {
    await expect(loader().load(fileFromText(JSON.stringify({ version: 1 }))))
      .rejects.toThrow('Missing or invalid');
  });

  test('rejects invalid coordinate', async () => {
    const data = { version: 1, pieces: { A1: { color: 'white', type: 'pion' } } };
    await expect(loader().load(fileFromText(JSON.stringify(data))))
      .rejects.toThrow('Invalid coordinate');
  });

  test('rejects invalid color', async () => {
    const data = { version: 1, pieces: { A2: { color: 'red', type: 'pion' } } };
    await expect(loader().load(fileFromText(JSON.stringify(data))))
      .rejects.toThrow('Invalid color');
  });

  test('rejects invalid type', async () => {
    const data = { version: 1, pieces: { A2: { color: 'white', type: 'king' } } };
    await expect(loader().load(fileFromText(JSON.stringify(data))))
      .rejects.toThrow('Invalid type');
  });



  test('rejects too many pieces', async () => {
    const pieces: Record<string, { color: string; type: string }> = {};
    const coords = ['A1', 'C1', 'E1', 'G1', 'B2', 'D2', 'F2', 'H2', 'A3', 'C3', 'E3', 'G3', 'B4', 'D4', 'F4', 'H4', 'A5'];
    for (const c of coords) {
      pieces[c] = { color: 'white', type: 'pion' };
    }
    await expect(loader().load(fileFromText(JSON.stringify({ version: 1, pieces }))))
      .rejects.toThrow();
  });
});
