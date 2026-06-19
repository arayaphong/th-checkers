// Single source of truth for event names — the contract between layers.
// Adding a feature means adding an entry here, not editing existing modules.
//
// Intent events flow View -> EventBus -> GameController.
// State events flow Store/GameController -> EventBus -> Views.
export const Events = Object.freeze({
  // --- Intent (View -> Controller) ---
  SQUARE_ACTIVATE: 'square:activate', // { r, c }
  CONTROL_UNDO: 'control:undo', // —
  CONTROL_REDO: 'control:redo', // —
  CONTROL_RESET: 'control:reset', // —
  OVERLAY_PLAY_AGAIN: 'overlay:playAgain', // —
  OVERLAY_REVIEW: 'overlay:review', // —
  OVERLAY_DISMISS: 'overlay:dismiss', // —
  VIEWPORT_RESIZED: 'viewport:resized', // { width, height }
  INPUT_FIRST_INTERACTION: 'input:firstInteraction', // — (audio unlock)

  // --- State (Store/Controller -> View) ---
  MATCH_CHANGED: 'match:changed', // { snapshot }
  SELECTION_CHANGED: 'selection:changed', // { selectedSquare, validMoves }
  GAME_OVER: 'game:over', // { winner, reason }
  VIEWPORT_CHANGED: 'viewport:changed', // { tooSmall }
  INTERACTION_LOCKED: 'interaction:locked', // —
  INTERACTION_UNLOCKED: 'interaction:unlocked', // —
  SOUND_PLAY: 'sound:play', // { kind: 'move' | 'capture' | 'promote' }
});
