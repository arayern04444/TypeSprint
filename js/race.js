/* =====================================================================
   Race — the core typing engine, shared by solo and multiplayer.

   Input capture: a hidden, always-focused <input> overlays the race
   area (see #race-input in index.html/CSS) instead of listening for
   keydown on a plain div. This is the standard technique real browser
   typing tests use, because it's the only approach that reliably
   receives characters from a mobile virtual keyboard, autocorrect
   insertions, or IME composition — none of which fire clean keydown
   sequences. On every `input` event we diff the input's value against
   the target text one character at a time, starting at the current
   position: every character — right or wrong — advances the race by
   one, the same way a real typing test works. A mismatch is marked
   red and costs accuracy/combo, but it's permanent (like a typo you
   can't take back once it's out) rather than a wall you have to
   retype the same letter against to get past — that "stuck on the
   letter you already know you got wrong" moment was confusing new
   players. Backspacing past a position already visited (right or
   wrong) is still blocked; the race never lets history un-happen.

   Dispatches a `race:finished` CustomEvent on window with the final
   run stats (echoing back `mode`) and does not assume what happens
   after that — callers (solo or multiplayer) react to it. The run also
   carries `rawWpm`/`consistency`/`timeline` (a per-second WPM/error
   graph, for the results screen only — Store strips it before saving
   to history) alongside the usual wpm/accuracy/chars.

   Timed mode: passing `timedDurationSec` to `load()` races the clock
   instead of the passage — the passage is just generated deliberately
   long (see passages.js's pickTimedPassage) so nobody reasonably
   reaches the end; `tick()` calls `finish()` once time's up, same as
   `handleCorrect`/`handleIncorrect` already do at `pos >= text.length`
   for a normal race (whichever happens first — `finished` guards both).
===================================================================== */
import { AudioEngine } from './audio.js';
import { Store } from './store.js';
import { wordsWithIndex } from './passages.js';

function normalizeQuotes(s) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

export const Race = (function () {
  let text = '';
  let difficulty = 'easy';
  let mode = 'solo';
  let timedDurationSec = null;
  let spans = [];
  let pos = 0;
  let mistakeCountAtPos = [];
  let combo = 0, bestCombo = 0;
  let correctChars = 0, totalKeystrokes = 0;
  let startTime = null, tickHandle = null;
  let charSeen = {}, charMissed = {}, wordSeen = {}, wordMissed = {};
  let finished = false;
  let comboLevel = 0;
  let progressHandler = null;
  // Cumulative snapshots taken every tick (250ms) — raw material for
  // the post-race WPM graph and consistency score. Kept separate from
  // the HUD's own running-average wpm/accuracy so neither can regress
  // the other.
  let samples = [];
  let errorTimes = [];

  const el = {
    container: document.getElementById('race-container'),
    input: document.getElementById('race-input'),
    passage: document.getElementById('passage-text'),
    caret: document.getElementById('caret'),
    particles: document.getElementById('particle-layer'),
    wpm: document.getElementById('hud-wpm'),
    accuracy: document.getElementById('hud-accuracy'),
    combo: document.getElementById('hud-combo'),
    time: document.getElementById('hud-time'),
    progress: document.getElementById('progress-bar'),
  };

  function load(passageObj) {
    text = passageObj.text;
    difficulty = passageObj.difficulty;
    mode = passageObj.mode || 'solo';
    timedDurationSec = passageObj.timedDurationSec || null;
    pos = 0; combo = 0; bestCombo = 0; correctChars = 0; totalKeystrokes = 0;
    startTime = null; finished = false; comboLevel = 0;
    mistakeCountAtPos = new Array(text.length).fill(0);
    charSeen = {}; charMissed = {}; wordSeen = {}; wordMissed = {};
    samples = []; errorTimes = [];
    el.container.classList.remove('combo-lvl-1', 'combo-lvl-2', 'combo-lvl-3');
    el.passage.innerHTML = '';
    spans = [];
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      el.passage.appendChild(span);
      spans.push(span);
    }
    updateHud();
    positionCaret();
    el.progress.style.width = '0%';
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tick, 250);
    el.input.disabled = false;
    el.input.value = '';
    el.input.focus();
  }

  function positionCaret() {
    const target = spans[pos];
    if (target) {
      el.caret.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
      el.caret.style.display = 'block';
    } else {
      const last = spans[spans.length - 1];
      if (last) el.caret.style.transform = `translate(${last.offsetLeft + last.offsetWidth}px, ${last.offsetTop}px)`;
      el.caret.style.display = 'none';
    }
  }

  function tick() {
    if (!startTime || finished) return;
    if (timedDurationSec && elapsedMinutes() * 60 >= timedDurationSec) { finish(); return; }
    samples.push({ t: elapsedMinutes() * 60, correctChars, totalKeystrokes });
    updateHud();
  }

  function elapsedMinutes() {
    if (!startTime) return 0;
    return (performance.now() - startTime) / 60000;
  }

  function updateHud() {
    const mins = elapsedMinutes();
    const secs = mins * 60;
    const wpm = mins > 0 ? Math.round((correctChars / 5) / mins) : 0;
    const acc = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;
    el.wpm.textContent = wpm;
    el.accuracy.textContent = acc + '%';
    el.combo.textContent = combo;
    // Timed mode counts down (and the bar tracks time remaining, not
    // text remaining) — the passage itself is deliberately oversized
    // padding, so "% of text typed" wouldn't mean anything there.
    if (timedDurationSec) {
      el.time.textContent = Math.max(0, timedDurationSec - secs).toFixed(1) + 's';
      el.progress.style.width = Math.round(Math.min(1, secs / timedDurationSec) * 100) + '%';
    } else {
      el.time.textContent = secs.toFixed(1) + 's';
      el.progress.style.width = Math.round((pos / text.length) * 100) + '%';
    }
    if (progressHandler) progressHandler({ pos, textLength: text.length, wpm, accuracy: acc, done: pos >= text.length });
  }

  function spawnParticles() {
    const cx = el.caret.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
    const baseX = cx ? parseFloat(cx[1]) : 20;
    const baseY = cx ? parseFloat(cx[2]) : 20;
    const n = Math.min(10, 4 + comboLevel * 3);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const angle = Math.random() * Math.PI * 2;
      const dist = 24 + Math.random() * 30;
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.left = baseX + 'px';
      s.style.top = baseY + 'px';
      s.style.background = i % 2 ? 'var(--accent)' : 'var(--accent-2)';
      el.particles.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  }

  function setComboLevel() {
    let lvl = combo >= 50 ? 3 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0;
    if (lvl !== comboLevel) {
      el.container.classList.remove('combo-lvl-1', 'combo-lvl-2', 'combo-lvl-3');
      if (lvl > 0) el.container.classList.add('combo-lvl-' + lvl);
      if (lvl > comboLevel && lvl > 0) { AudioEngine.comboMilestone(); spawnParticles(); }
      comboLevel = lvl;
    }
  }

  function handleCorrect() {
    spans[pos].classList.add('correct');
    const ch = text[pos].toLowerCase();
    charSeen[ch] = (charSeen[ch] || 0) + 1;
    correctChars++; totalKeystrokes++; combo++; bestCombo = Math.max(bestCombo, combo);
    pos++;
    AudioEngine.correct();
    setComboLevel();
    positionCaret();
    updateHud();
    if (pos >= text.length) finish();
  }

  // A wrong character now costs accuracy/combo but still moves the
  // race forward (like handleCorrect) instead of holding the player at
  // this position until they retype the exact right letter.
  function handleIncorrect() {
    mistakeCountAtPos[pos] = 1;
    totalKeystrokes++;
    errorTimes.push(elapsedMinutes() * 60);
    const ch = text[pos].toLowerCase();
    charSeen[ch] = (charSeen[ch] || 0) + 1;
    charMissed[ch] = (charMissed[ch] || 0) + 1;
    spans[pos].classList.add('incorrect');
    combo = 0;
    comboLevel = 0;
    el.container.classList.remove('combo-lvl-1', 'combo-lvl-2', 'combo-lvl-3');
    AudioEngine.error();
    el.container.classList.remove('shake');
    void el.container.offsetWidth;
    el.container.classList.add('shake');
    pos++;
    positionCaret();
    updateHud();
    if (pos >= text.length) finish();
  }

  function finishWordWeakness() {
    // Only what was actually typed (text.slice(0, pos)) — not the full
    // passage. Harmless today since pos always equals text.length when
    // this runs, but a timed race can finish with pos < text.length
    // (the passage is deliberately padded past what anyone will type),
    // and the untyped remainder must not count as "seen".
    const words = wordsWithIndex(text.slice(0, pos));
    for (const { word, start, end } of words) {
      wordSeen[word] = (wordSeen[word] || 0) + 1;
      let hadMistake = false;
      for (let i = start; i < end; i++) if (mistakeCountAtPos[i] > 0) { hadMistake = true; break; }
      if (hadMistake) wordMissed[word] = (wordMissed[word] || 0) + 1;
    }
  }

  // One point per whole second of the race: the *instantaneous* wpm/raw
  // for that second (chars typed during just that second), not the
  // cumulative running average the HUD shows — this is what makes the
  // graph show pacing/dips instead of a smoothed-out flat line. Error
  // markers land on whichever second they happened in.
  function buildTimeline() {
    const totalSec = Math.max(1, Math.round(samples.length ? samples[samples.length - 1].t : 0));
    const points = [];
    let idx = 0;
    let prevCorrect = 0, prevTotal = 0;
    for (let sec = 1; sec <= totalSec; sec++) {
      while (idx < samples.length - 1 && samples[idx + 1].t <= sec) idx++;
      const snap = samples[idx] || { correctChars: 0, totalKeystrokes: 0 };
      const dCorrect = snap.correctChars - prevCorrect;
      const dTotal = snap.totalKeystrokes - prevTotal;
      points.push({ t: sec, wpm: Math.max(0, Math.round((dCorrect / 5) * 60)), raw: Math.max(0, Math.round((dTotal / 5) * 60)) });
      prevCorrect = snap.correctChars;
      prevTotal = snap.totalKeystrokes;
    }
    const errorSeconds = [...new Set(errorTimes.map((t) => Math.max(1, Math.ceil(t))))];
    return { points, errorSeconds };
  }

  // Standard coefficient-of-variation approach: how steady the pace was
  // second to second, not just the average. 100 = perfectly even pace.
  function computeConsistency(points) {
    if (points.length < 2) return 100;
    const wpms = points.map((p) => p.wpm);
    const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
    if (mean <= 0) return 0;
    const variance = wpms.reduce((a, b) => a + (b - mean) ** 2, 0) / wpms.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
  }

  function finish() {
    finished = true;
    clearInterval(tickHandle);
    el.input.blur();
    const mins = elapsedMinutes();
    const wpm = mins > 0 ? Math.round((correctChars / 5) / mins) : 0;
    const rawWpm = mins > 0 ? Math.round((totalKeystrokes / 5) / mins) : 0;
    const acc = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;
    finishWordWeakness();
    Store.updateWeakness(charSeen, charMissed, wordSeen, wordMissed);
    AudioEngine.raceComplete();
    const timeline = buildTimeline();
    const run = {
      date: new Date().toISOString(),
      wpm, rawWpm, accuracy: acc, consistency: computeConsistency(timeline.points), bestCombo, difficulty, mode,
      timedDurationSec,
      durationSec: Math.round(mins * 600) / 10,
      // Actual characters typed, not the full passage length — was
      // always equivalent before (finish() only fired at pos ===
      // text.length), but a timed race can end early.
      chars: pos,
      timeline,
    };
    window.dispatchEvent(new CustomEvent('race:finished', { detail: run }));
  }

  function handleInputEvent() {
    if (finished) return;
    const value = normalizeQuotes(el.input.value);

    if (value.length < pos) {
      // Tried to backspace past a position already visited — snap
      // back. Target text is never "undone"; this keeps the race
      // honest, and a wrong letter is a permanent mistake, not
      // something to erase and retry.
      el.input.value = text.slice(0, pos);
      return;
    }

    if (!startTime) { startTime = performance.now(); AudioEngine.resume(); }

    while (pos < value.length && pos < text.length) {
      if (value[pos] === text[pos]) handleCorrect();
      else handleIncorrect();
      if (finished) return;
    }
  }

  function quit() {
    finished = true;
    if (tickHandle) clearInterval(tickHandle);
    el.input.blur();
  }

  el.input.addEventListener('input', handleInputEvent);

  return {
    load, quit,
    setProgressHandler(fn) { progressHandler = fn; },
    get difficulty() { return difficulty; },
  };
})();
