// Web Audio sound effects. Owns the AudioContext lifecycle — browsers require
// a user gesture before audio may start — and a data-driven table of short
// synthesized tones. Plays a tone in response to each `sound:play` event.
import { Events } from '../core/events.js';

const MUTE_STORAGE_KEY = 'th-checkers-muted';

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
  #muted = false;
  #winGain = null;
  #winLoop = null;

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
    this.#bus.on(Events.SOUND_WIN_STOP, () => this.stopWin());
  }

  isMuted() {
    return this.#muted;
  }

  setMuted(muted) {
    this.#muted = Boolean(muted);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(this.#muted));
      } catch {
        // Storage is optional; failures should not block audio toggling.
      }
    }
    this.#bus.emit(Events.SOUND_MUTED_CHANGED, this.#muted);
  }

  toggleMuted() {
    this.setMuted(!this.#muted);
  }

  loadMutedPreference() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(MUTE_STORAGE_KEY);
      if (saved !== null) this.#muted = saved === 'true';
    } catch {
      // Storage is optional.
    }
  }

  async #playWin() {
    const ctx = await this.#initialize();
    if (!ctx || this.#winGain) return;

    this.#winGain = ctx.createGain();
    this.#winGain.gain.value = 0.38;
    this.#winGain.connect(ctx.destination);
    this.#scheduleWinLoop(ctx, ctx.currentTime);
  }

  #scheduleWinLoop(ctx, startAt) {
    if (!this.#winGain) return;

    // Melody: C major arpeggio + harmony, 1.5s loop
    const MELODY = [
      { freq: 329.63, t: 0.3, dur: 1.2, vol: 0.55 }, // E4
      { freq: 392.00, t: 0.9, dur: 1.2, vol: 0.55 }, // G4
      { freq: 523.25, t: 1.6, dur: 1.4, vol: 0.65 }, // C5
      { freq: 659.25, t: 2.6, dur: 1.1, vol: 0.58 }, // E5
      { freq: 783.99, t: 3.4, dur: 1.3, vol: 0.62 }, // G5
      { freq: 1046.5, t: 4.4, dur: 2.0, vol: 0.72 }, // C6
      // harmony อุ่นๆ
      { freq: 261.63, t: 0.0, dur: 1.0, vol: 0.18 }, // C4 pad
      { freq: 196.00, t: 1.6, dur: 3.0, vol: 0.22 }, // G3
      { freq: 261.63, t: 4.4, dur: 2.0, vol: 0.25 },
      { freq: 329.63, t: 4.4, dur: 2.0, vol: 0.20 },
    ];

    for (const { freq, t, dur, vol } of MELODY) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(this.#winGain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const s = startAt + t;
      g.gain.setValueAtTime(vol, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s);
      osc.stop(s + dur + 0.02);
    }
  }

  stopWin() {
    if (this.#winLoop !== null) {
      clearTimeout(this.#winLoop);
      this.#winLoop = null;
    }
    if (this.#winGain && this.#ctx?.state === 'running') {
      const g = this.#winGain;
      const ctx = this.#ctx;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 400);
    }
    this.#winGain = null;
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
    if (this.#muted) return;
    if (type === 'win') return this.#playWin();
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
