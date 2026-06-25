// Load a position file (JSON) and produce a Game instance.
//
// File format (version 1):
//   {
//     "version": 1,
//     "pieces": {
//       "D5": { "color": "white", "type": "pion" },
//       "C4": { "color": "black", "type": "pion" }
//     }
//   }
//
// Coordinates must be algebraic squares on playable dark squares (A1..H8).
// Color is "white" or "black"; type is "pion" or "dame".

import { Board, Game, PieceColor, PieceType, Position } from '../../../dist/index.js';

export class StateLoaderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StateLoaderError';
  }
}

const COLOR_MAP = {
  white: PieceColor.WHITE,
  black: PieceColor.BLACK,
};

const TYPE_MAP = {
  pion: PieceType.PION,
  dame: PieceType.DAME,
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class StateLoader {
  /**
   * Read a web File/Blob as text, parse it as a position file, and build a Game.
   * Returns { game, board }.
   */
  async load(file) {
    const text = await this.#readFile(file);
    const data = this.#parseJson(text);
    return this.loadFromObject(data);
  }

  /**
   * Build a Game from an already-parsed plain object.
   * Useful for tests and for direct programmatic use.
   */
  loadFromObject(data) {
    this.#validateVersion(data);
    const pieces = this.#validatePieces(data);

    let board;
    try {
      board = Board.fromPieces(pieces);
    } catch (err) {
      throw new StateLoaderError(err?.message ?? 'Invalid piece layout');
    }

    return { game: new Game(board), board };
  }

  #readFile(file) {
    if (typeof file === 'string') {
      return Promise.resolve(file);
    }
    if (!file || typeof file.text !== 'function') {
      return Promise.reject(new StateLoaderError('Expected a File or Blob'));
    }
    return file.text();
  }

  #parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      throw new StateLoaderError('Invalid JSON');
    }
  }

  #validateVersion(data) {
    if (!isPlainObject(data)) {
      throw new StateLoaderError('File must contain a JSON object');
    }
    if (data.version !== 1) {
      throw new StateLoaderError('Unsupported file version');
    }
  }

  #validatePieces(data) {
    if (!isPlainObject(data.pieces)) {
      throw new StateLoaderError('Missing or invalid "pieces" object');
    }

    const pieces = [];
    const seen = new Set();

    for (const [coordinate, info] of Object.entries(data.pieces)) {
      if (!isPlainObject(info)) {
        throw new StateLoaderError(`Invalid piece at ${coordinate}`);
      }

      let position;
      try {
        position = Position.fromString(coordinate);
      } catch {
        throw new StateLoaderError(`Invalid coordinate: ${coordinate}`);
      }

      const key = position.hash();
      if (seen.has(key)) {
        throw new StateLoaderError(`Duplicate coordinate: ${coordinate}`);
      }
      seen.add(key);

      const color = COLOR_MAP[info.color];
      if (color === undefined) {
        throw new StateLoaderError(`Invalid color at ${coordinate}: ${info.color}`);
      }

      const type = TYPE_MAP[info.type];
      if (type === undefined) {
        throw new StateLoaderError(`Invalid type at ${coordinate}: ${info.type}`);
      }

      pieces.push([position, { color, type }]);
    }

    return pieces;
  }
}
