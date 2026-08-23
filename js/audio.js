/* =====================================================================
   AudioEngine — Web Audio API oscillator blips, no audio files.
   Lazily creates its AudioContext on first use (browser autoplay policy).
===================================================================== */
import { Store } from './store.js';

export const AudioEngine = (function () {
  let ctx = null;
  let master = null;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function resume() {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  function tone(freq, duration, type, gainVal, delay) {
    if (!Store.load().settings.soundOn) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainVal || 0.3, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  }

  return {
    resume,
    correct: () => tone(920, 0.05, 'sine', 0.18),
    error: () => tone(160, 0.12, 'sawtooth', 0.22),
    comboMilestone: () => { [660, 880, 1108].forEach((f, i) => tone(f, 0.1, 'triangle', 0.22, i * 0.07)); },
    achievement: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, i * 0.09)); },
    raceComplete: () => { [784, 988, 1174].forEach((f, i) => tone(f, 0.18, 'sine', 0.22, i * 0.1)); },
    countdownTick: () => tone(440, 0.08, 'square', 0.2),
    countdownGo: () => tone(660, 0.25, 'square', 0.28),
  };
})();
