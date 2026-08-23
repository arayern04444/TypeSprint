/* =====================================================================
   Race — the core typing engine. Keydown-driven, index-based comparison
   against a target passage, "mistake blocks progress" model, live
   WPM/accuracy/combo. Dispatches a `race:finished` CustomEvent on
   window with the final run stats and does not assume what happens
   after that — callers (solo or, later, multiplayer) react to it.
===================================================================== */
import { AudioEngine } from './audio.js';
import { Store } from './store.js';
import { wordsWithIndex } from './passages.js';

const MISTAKE_CAP_PER_CHAR = 5;

export const Race = (function () {
  let text = '';
  let difficulty = 'easy';
  let spans = [];
  let pos = 0;
  let mistakeCountAtPos = [];
  let combo = 0, bestCombo = 0;
  let correctChars = 0, totalKeystrokes = 0;
  let startTime = null, tickHandle = null;
  let charSeen = {}, charMissed = {}, wordSeen = {}, wordMissed = {};
  let finished = false;
  let comboLevel = 0;

  const el = {
    container: document.getElementById('race-container'),
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
    pos = 0; combo = 0; bestCombo = 0; correctChars = 0; totalKeystrokes = 0;
    startTime = null; finished = false; comboLevel = 0;
    mistakeCountAtPos = new Array(text.length).fill(0);
    charSeen = {}; charMissed = {}; wordSeen = {}; wordMissed = {};
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
    el.container.focus();
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
    updateHud();
  }

  function elapsedMinutes() {
    if (!startTime) return 0;
    return (performance.now() - startTime) / 60000;
  }

  function updateHud() {
    const mins = elapsedMinutes();
    const wpm = mins > 0 ? Math.round((correctChars / 5) / mins) : 0;
    const acc = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;
    el.wpm.textContent = wpm;
    el.accuracy.textContent = acc + '%';
    el.combo.textContent = combo;
    el.time.textContent = (mins * 60).toFixed(1) + 's';
    el.progress.style.width = Math.round((pos / text.length) * 100) + '%';
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
    if (mistakeCountAtPos[pos] > 0) charMissed[ch] = (charMissed[ch] || 0) + 1;
    correctChars++; totalKeystrokes++; combo++; bestCombo = Math.max(bestCombo, combo);
    pos++;
    AudioEngine.correct();
    setComboLevel();
    positionCaret();
    updateHud();
    if (pos >= text.length) finish();
  }

  function handleIncorrect() {
    mistakeCountAtPos[pos] = (mistakeCountAtPos[pos] || 0) + 1;
    if (mistakeCountAtPos[pos] <= MISTAKE_CAP_PER_CHAR) totalKeystrokes++;
    spans[pos].classList.remove('incorrect');
    void spans[pos].offsetWidth;
    spans[pos].classList.add('incorrect');
    combo = 0;
    comboLevel = 0;
    el.container.classList.remove('combo-lvl-1', 'combo-lvl-2', 'combo-lvl-3');
    AudioEngine.error();
    el.container.classList.remove('shake');
    void el.container.offsetWidth;
    el.container.classList.add('shake');
    updateHud();
  }

  function clearIncorrectFlash() {
    if (pos < spans.length && spans[pos].classList.contains('incorrect')) {
      spans[pos].classList.remove('incorrect');
    }
  }

  function finishWordWeakness() {
    const words = wordsWithIndex(text);
    for (const { word, start, end } of words) {
      wordSeen[word] = (wordSeen[word] || 0) + 1;
      let hadMistake = false;
      for (let i = start; i < end; i++) if (mistakeCountAtPos[i] > 0) { hadMistake = true; break; }
      if (hadMistake) wordMissed[word] = (wordMissed[word] || 0) + 1;
    }
  }

  function finish() {
    finished = true;
    clearInterval(tickHandle);
    const mins = elapsedMinutes();
    const wpm = mins > 0 ? Math.round((correctChars / 5) / mins) : 0;
    const acc = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;
    finishWordWeakness();
    Store.updateWeakness(charSeen, charMissed, wordSeen, wordMissed);
    AudioEngine.raceComplete();
    const run = {
      date: new Date().toISOString(),
      wpm, accuracy: acc, bestCombo, difficulty,
      durationSec: Math.round(mins * 600) / 10,
      chars: text.length,
    };
    window.dispatchEvent(new CustomEvent('race:finished', { detail: run }));
  }

  function keydown(e) {
    if (finished) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      clearIncorrectFlash();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    e.preventDefault();
    if (pos >= text.length) return;
    if (!startTime) { startTime = performance.now(); AudioEngine.resume(); }
    if (e.key === text[pos]) handleCorrect(); else handleIncorrect();
  }

  function quit() {
    finished = true;
    if (tickHandle) clearInterval(tickHandle);
  }

  return { load, keydown, quit, get difficulty() { return difficulty; } };
})();

document.getElementById('race-container').addEventListener('keydown', Race.keydown);
