/* =====================================================================
   AudioEngine — Web Audio API oscillator blips, no audio files.
   Lazily creates its AudioContext on first use (browser autoplay
   policy). Tones are data-driven per sound pack (Store's
   settings.soundPack) so packs won by chests can be equipped without
   touching the playback code — see PACKS below for the "default"
   values, which match the game's original fixed tones exactly.
===================================================================== */
import { Store } from './store.js';

const PACKS = {
  default: {
    correct: { freq: 920, dur: 0.05, type: 'sine', gain: 0.18 },
    error: { freq: 160, dur: 0.12, type: 'sawtooth', gain: 0.22 },
    comboMilestone: { freqs: [660, 880, 1108], dur: 0.1, type: 'triangle', gain: 0.22, step: 0.07 },
    achievement: { freqs: [523, 659, 784, 1046], dur: 0.18, type: 'triangle', gain: 0.22, step: 0.09 },
    raceComplete: { freqs: [784, 988, 1174], dur: 0.18, type: 'sine', gain: 0.22, step: 0.1 },
    countdownTick: { freq: 440, dur: 0.08, type: 'square', gain: 0.2 },
    countdownGo: { freq: 660, dur: 0.25, type: 'square', gain: 0.28 },
    chest: { freqs: [440, 660, 880, 1320], dur: 0.15, type: 'triangle', gain: 0.22, step: 0.08 },
  },
  arcade: {
    correct: { freq: 1200, dur: 0.04, type: 'square', gain: 0.15 },
    error: { freq: 180, dur: 0.1, type: 'square', gain: 0.25 },
    comboMilestone: { freqs: [784, 988, 1245], dur: 0.08, type: 'square', gain: 0.2, step: 0.06 },
    achievement: { freqs: [660, 880, 1046, 1318], dur: 0.14, type: 'square', gain: 0.22, step: 0.08 },
    raceComplete: { freqs: [988, 1245, 1568], dur: 0.14, type: 'square', gain: 0.22, step: 0.09 },
    countdownTick: { freq: 523, dur: 0.06, type: 'square', gain: 0.22 },
    countdownGo: { freq: 784, dur: 0.2, type: 'square', gain: 0.3 },
    chest: { freqs: [523, 784, 1046, 1568], dur: 0.12, type: 'square', gain: 0.24, step: 0.07 },
  },
  mechanical: {
    correct: { freq: 700, dur: 0.02, type: 'square', gain: 0.2 },
    error: { freq: 140, dur: 0.05, type: 'square', gain: 0.28 },
    comboMilestone: { freqs: [500, 500, 700], dur: 0.03, type: 'square', gain: 0.25, step: 0.05 },
    achievement: { freqs: [600, 600, 600, 900], dur: 0.05, type: 'square', gain: 0.25, step: 0.06 },
    raceComplete: { freqs: [600, 600, 900], dur: 0.05, type: 'square', gain: 0.25, step: 0.06 },
    countdownTick: { freq: 500, dur: 0.03, type: 'square', gain: 0.22 },
    countdownGo: { freq: 800, dur: 0.08, type: 'square', gain: 0.3 },
    chest: { freqs: [500, 700, 900, 1100], dur: 0.04, type: 'square', gain: 0.26, step: 0.05 },
  },
};

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

  function currentPack() {
    return PACKS[Store.load().settings.soundPack] || PACKS.default;
  }

  function play(name) {
    const spec = currentPack()[name];
    if (!spec) return;
    if (spec.freqs) spec.freqs.forEach((f, i) => tone(f, spec.dur, spec.type, spec.gain, i * spec.step));
    else tone(spec.freq, spec.dur, spec.type, spec.gain);
  }

  return {
    resume,
    correct: () => play('correct'),
    error: () => play('error'),
    comboMilestone: () => play('comboMilestone'),
    achievement: () => play('achievement'),
    raceComplete: () => play('raceComplete'),
    countdownTick: () => play('countdownTick'),
    countdownGo: () => play('countdownGo'),
    chest: () => play('chest'),
  };
})();
