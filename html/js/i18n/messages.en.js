export const en = {
  app: {
    title: 'Thai Checkers',
    boardLabel: 'Checkers board',
    historyLabel: 'Move history',
    controls: {
      undo: 'Undo',
      redo: 'Redo',
      reset: 'New game',
      review: 'Review game',
      playAgain: 'Play again',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      loadState: 'Load position from file',
      language: 'Switch language',
    },
    viewport: {
      title: 'Cannot display game',
      descriptionLine1: 'The available space is too small.',
      descriptionLine2: 'Please make the window larger.',
    },
  },
  players: {
    white: 'Macaw player',
    black: 'Cockatoo player',
    whiteIcon: 'macaw',
    blackIcon: 'cockatoo',
  },
  pieces: {
    pion: 'regular piece',
    dame: 'king',
    count: ({ type, count }) => `${count} ${type}${count === 1 ? '' : 's'}`,
  },
  board: {
    unplayable: 'unplayable square',
    noLegalMove: 'no legal moves',
    empty: 'empty square',
    selected: 'selected',
    legalTarget: 'legal move target',
    square: ({ coordinate, details }) => `${coordinate}: ${details}`,
  },
  status: {
    gameOver: 'Game over',
    turn: ({ player }) => `${player}'s turn`,
  },
  history: {
    capture: ({ count }) => `captured ${count} piece${count === 1 ? '' : 's'}`,
    captureTitle: ({ count }) =>
      count > 1 ? `Captured ${count} pieces` : 'Captured a piece',
    promotion: 'promoted to king',
    current: 'current position',
    entry: ({ index, player, from, to, details }) =>
      `Move ${index}, ${player}, from ${from} to ${to}${details}`,
  },
  stats: {
    noneCaptured: ({ capturer }) => `${capturer} has not captured any pieces`,
    captured: ({ capturer, owner, counts }) =>
      `${capturer} captured from ${owner}: ${counts.join(' and ')}`,
  },
  loadState: {
    errorTitle: 'Could not load position',
    errors: {
      invalidJson: 'The file is not valid JSON.',
      unsupportedVersion: 'Unsupported file version.',
      invalidPieces: 'Missing or invalid "pieces" object.',
      invalidCoordinate: 'Invalid board coordinate.',
      invalidPiece: 'Invalid piece color or type.',
      duplicateCoordinate: 'Duplicate coordinate.',
      tooManyPieces: 'Too many pieces (maximum 16).',
      unknown: 'Failed to load the file.',
    },
  },
  gameOver: {
    initialTitle: 'Macaw player wins!',
    winner: ({ player }) => `${player} wins!`,
    initialDescription: 'The opponent has no pieces left to move.',
    reasons: {
      noMoves: 'No legal moves remain',
      noPieces: 'All pieces have been captured',
    },
  },
};
