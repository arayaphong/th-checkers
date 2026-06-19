// Minimal synchronous publish/subscribe core for the event-bus MVC.
// Views emit intent events; stores/controller emit state events. Nothing in
// here knows about the DOM or the game — it is the decoupling seam.
export class EventBus {
  #handlers = new Map();

  // Subscribe to an event type. Returns an unsubscribe function.
  on(type, handler) {
    let handlers = this.#handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.#handlers.set(type, handlers);
    }
    handlers.add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    this.#handlers.get(type)?.delete(handler);
  }

  // Notify every subscriber of `type`. Iterates a copy so handlers may
  // subscribe/unsubscribe during dispatch without disturbing this emit.
  emit(type, payload) {
    const handlers = this.#handlers.get(type);
    if (!handlers) return;
    for (const handler of [...handlers]) handler(payload);
  }
}
