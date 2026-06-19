// Web Audio sound effects. Owns the AudioContext lifecycle — browsers require
// a user gesture before audio may start — and a data-driven table of short
// synthesized tones. Plays a tone in response to each `sound:play` event.
import { Events } from '../core/events.js';

// Each entry shapes a tone on a fresh oscillator + gain pair and returns the
// time at which the oscillator should stop. `now` is the context start time.
const SOUNDS = {
  move(osc, gain, now) {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    return now + 0.1;
  },
  capture(osc, gain, now) {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    return now + 0.15;
  },
  promote(osc, gain, now) {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.1);
    osc.frequency.setValueAtTime(659.25, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    return now + 0.5;
  },
};

export class AudioService {
  #bus;
  #AudioContextClass;
  #ctx = null;
  #initPromise = null;

  constructor(bus, { audioContextClass } = {}) {
    this.#bus = bus;
    this.#AudioContextClass =
      audioContextClass ?? window.AudioContext ?? window.webkitAudioContext;
  }

  // Unlock the context on the first user gesture and play tones on demand.
  start() {
    const activate = () => void this.#initialize();
    document.addEventListener('pointerdown', activate, { capture: true });
    document.addEventListener('keydown', activate, { capture: true });
    this.#bus.on(Events.SOUND_PLAY, (type) => this.play(type));
  }

  async #initialize() {
    if (!this.#AudioContextClass) return null;
    if (this.#ctx?.state === 'running') return this.#ctx;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = (async () => {
      try {
        if (!this.#ctx || this.#ctx.state === 'closed') {
          this.#ctx = new this.#AudioContextClass();
        }
        if (this.#ctx.state !== 'running') await this.#ctx.resume();
        return this.#ctx.state === 'running' ? this.#ctx : null;
      } catch {
        const failed = this.#ctx;
        this.#ctx = null;
        if (failed && failed.state !== 'closed') {
          try {
            await failed.close();
          } catch {
            // Audio is optional; a failed cleanup must not affect gameplay.
          }
        }
        return null;
      }
    })();

    try {
      return await this.#initPromise;
    } finally {
      this.#initPromise = null;
    }
  }

  async play(type) {
    const shape = SOUNDS[type];
    if (!shape) return;
    const context = await this.#initialize();
    if (!context) return;

    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    const stopAt = shape(osc, gain, now);
    osc.start(now);
    osc.stop(stopAt);
  }
}
