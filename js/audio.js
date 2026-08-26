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
  synth: {
    correct: { freq: 660, dur: 0.09, type: 'triangle', gain: 0.2 },
    error: { freq: 130, dur: 0.16, type: 'sawtooth', gain: 0.24 },
    comboMilestone: { freqs: [440, 554, 659], dur: 0.14, type: 'triangle', gain: 0.22, step: 0.09 },
    achievement: { freqs: [392, 494, 587, 784], dur: 0.22, type: 'sine', gain: 0.24, step: 0.11 },
    raceComplete: { freqs: [523, 659, 784, 1046], dur: 0.22, type: 'triangle', gain: 0.24, step: 0.12 },
    countdownTick: { freq: 349, dur: 0.1, type: 'triangle', gain: 0.2 },
    countdownGo: { freq: 523, dur: 0.3, type: 'triangle', gain: 0.28 },
    chest: { freqs: [349, 523, 659, 880], dur: 0.18, type: 'sine', gain: 0.24, step: 0.1 },
  },
  chiptune: {
    correct: { freq: 1568, dur: 0.03, type: 'square', gain: 0.16 },
    error: { freq: 220, dur: 0.09, type: 'square', gain: 0.26 },
    comboMilestone: { freqs: [1046, 1318, 1568], dur: 0.05, type: 'square', gain: 0.22, step: 0.045 },
    achievement: { freqs: [784, 1046, 1318, 1760], dur: 0.08, type: 'square', gain: 0.24, step: 0.06 },
    raceComplete: { freqs: [1046, 1318, 1568, 2093], dur: 0.08, type: 'square', gain: 0.24, step: 0.06 },
    countdownTick: { freq: 880, dur: 0.04, type: 'square', gain: 0.22 },
    countdownGo: { freq: 1318, dur: 0.15, type: 'square', gain: 0.3 },
    chest: { freqs: [659, 880, 1046, 1568, 2093], dur: 0.06, type: 'square', gain: 0.26, step: 0.05 },
  },
  laser: {
    correct: { freq: 1800, dur: 0.035, type: 'sawtooth', gain: 0.14 },
    error: { freq: 90, dur: 0.14, type: 'sawtooth', gain: 0.26 },
    comboMilestone: { freqs: [900, 1350, 1800], dur: 0.06, type: 'sawtooth', gain: 0.2, step: 0.05 },
    achievement: { freqs: [600, 900, 1200, 1800], dur: 0.12, type: 'sawtooth', gain: 0.22, step: 0.07 },
    raceComplete: { freqs: [900, 1350, 1800, 2400], dur: 0.12, type: 'sawtooth', gain: 0.24, step: 0.08 },
    countdownTick: { freq: 660, dur: 0.05, type: 'sawtooth', gain: 0.2 },
    countdownGo: { freq: 1200, dur: 0.22, type: 'sawtooth', gain: 0.3 },
    chest: { freqs: [500, 900, 1350, 1900], dur: 0.1, type: 'sawtooth', gain: 0.25, step: 0.06 },
  },
  zen: {
    correct: { freq: 520, dur: 0.07, type: 'sine', gain: 0.12 },
    error: { freq: 180, dur: 0.14, type: 'sine', gain: 0.16 },
    comboMilestone: { freqs: [392, 440, 523], dur: 0.16, type: 'sine', gain: 0.14, step: 0.1 },
    achievement: { freqs: [330, 392, 440, 523], dur: 0.24, type: 'sine', gain: 0.16, step: 0.13 },
    raceComplete: { freqs: [392, 440, 523, 659], dur: 0.24, type: 'sine', gain: 0.16, step: 0.13 },
    countdownTick: { freq: 294, dur: 0.1, type: 'sine', gain: 0.14 },
    countdownGo: { freq: 440, dur: 0.32, type: 'sine', gain: 0.2 },
    chest: { freqs: [330, 440, 523, 659], dur: 0.2, type: 'sine', gain: 0.16, step: 0.12 },
  },
  click: {
    correct: { freq: 3200, dur: 0.012, type: 'square', gain: 0.12 },
    error: { freq: 140, dur: 0.07, type: 'square', gain: 0.22 },
    comboMilestone: { freqs: [2400, 2800, 3200], dur: 0.02, type: 'square', gain: 0.16, step: 0.04 },
    achievement: { freqs: [1800, 2200, 2600, 3200], dur: 0.03, type: 'square', gain: 0.2, step: 0.05 },
    raceComplete: { freqs: [2000, 2600, 3200], dur: 0.03, type: 'square', gain: 0.2, step: 0.05 },
    countdownTick: { freq: 1600, dur: 0.02, type: 'square', gain: 0.18 },
    countdownGo: { freq: 2600, dur: 0.1, type: 'square', gain: 0.26 },
    chest: { freqs: [1400, 1900, 2400, 3000], dur: 0.03, type: 'square', gain: 0.22, step: 0.04 },
  },
  pop: {
    correct: { freq: 740, dur: 0.06, type: 'triangle', gain: 0.2 },
    error: { freq: 170, dur: 0.13, type: 'triangle', gain: 0.24 },
    comboMilestone: { freqs: [523, 659, 880], dur: 0.1, type: 'triangle', gain: 0.22, step: 0.07 },
    achievement: { freqs: [440, 587, 740, 988], dur: 0.16, type: 'triangle', gain: 0.24, step: 0.09 },
    raceComplete: { freqs: [659, 880, 1108], dur: 0.16, type: 'triangle', gain: 0.24, step: 0.1 },
    countdownTick: { freq: 392, dur: 0.09, type: 'triangle', gain: 0.2 },
    countdownGo: { freq: 587, dur: 0.24, type: 'triangle', gain: 0.28 },
    chest: { freqs: [392, 523, 659, 880], dur: 0.14, type: 'triangle', gain: 0.24, step: 0.08 },
  },
  beep: {
    correct: { freq: 1000, dur: 0.05, type: 'sine', gain: 0.2 },
    error: { freq: 220, dur: 0.12, type: 'sine', gain: 0.22 },
    comboMilestone: { freqs: [700, 900, 1100], dur: 0.09, type: 'sine', gain: 0.2, step: 0.06 },
    achievement: { freqs: [600, 800, 1000, 1200], dur: 0.15, type: 'sine', gain: 0.22, step: 0.08 },
    raceComplete: { freqs: [800, 1000, 1200], dur: 0.15, type: 'sine', gain: 0.22, step: 0.09 },
    countdownTick: { freq: 500, dur: 0.07, type: 'sine', gain: 0.2 },
    countdownGo: { freq: 900, dur: 0.22, type: 'sine', gain: 0.26 },
    chest: { freqs: [500, 700, 900, 1100], dur: 0.13, type: 'sine', gain: 0.22, step: 0.07 },
  },
  typewriter: {
    correct: { freq: 480, dur: 0.025, type: 'square', gain: 0.22 },
    error: { freq: 110, dur: 0.1, type: 'square', gain: 0.28 },
    // A typewriter's carriage bell — a bright "ding" tacked on the end
    // of the milestone chimes, distinct from the low mechanical thock
    // of every keystroke.
    comboMilestone: { freqs: [400, 400, 1760], dur: 0.03, type: 'square', gain: 0.24, step: 0.05 },
    achievement: { freqs: [420, 420, 420, 1760], dur: 0.04, type: 'square', gain: 0.26, step: 0.06 },
    raceComplete: { freqs: [420, 420, 1760], dur: 0.04, type: 'square', gain: 0.26, step: 0.06 },
    countdownTick: { freq: 440, dur: 0.03, type: 'square', gain: 0.22 },
    countdownGo: { freq: 1760, dur: 0.14, type: 'square', gain: 0.3 },
    chest: { freqs: [420, 420, 420, 1760], dur: 0.05, type: 'square', gain: 0.26, step: 0.05 },
  },
  marimba: {
    // A real pentatonic scale (C-D-E-G-A), warm triangle tone.
    correct: { freq: 587, dur: 0.1, type: 'triangle', gain: 0.18 },
    error: { freq: 196, dur: 0.14, type: 'triangle', gain: 0.2 },
    comboMilestone: { freqs: [523, 587, 659], dur: 0.14, type: 'triangle', gain: 0.2, step: 0.08 },
    achievement: { freqs: [523, 587, 659, 784], dur: 0.2, type: 'triangle', gain: 0.22, step: 0.1 },
    raceComplete: { freqs: [659, 784, 880], dur: 0.2, type: 'triangle', gain: 0.22, step: 0.11 },
    countdownTick: { freq: 440, dur: 0.1, type: 'triangle', gain: 0.18 },
    countdownGo: { freq: 659, dur: 0.28, type: 'triangle', gain: 0.26 },
    chest: { freqs: [523, 587, 659, 784, 880], dur: 0.16, type: 'triangle', gain: 0.22, step: 0.09 },
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
