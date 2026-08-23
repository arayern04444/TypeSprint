/* =====================================================================
   Store — localStorage persistence for solo/local game state.
   Namespaced under STORAGE_KEY, with an in-memory fallback if storage
   is unavailable (e.g. private browsing, sandboxed preview contexts).
===================================================================== */

const STORAGE_KEY = 'typingGame.v1';
const HISTORY_CAP = 100;

function defaultState() {
  return {
    version: 1,
    settings: { theme: 'default', difficulty: 'easy', soundOn: true },
    bestWpm: 0,
    bestAccuracy: 0,
    totalRaces: 0,
    history: [],
    weakChars: {},
    weakWords: {},
    achievements: {},
    unlockedThemes: ['default'],
    streakDays: { count: 0, lastPlayedDate: null },
  };
}

export const Store = (function () {
  let mem = null;
  let persistWarned = false;

  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      mem = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
    } catch (e) {
      if (!persistWarned) { console.warn('TypeSprint: localStorage unavailable, progress will not be saved.'); persistWarned = true; }
      mem = defaultState();
    }
    return mem;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mem)); }
    catch (e) { if (!persistWarned) { console.warn('TypeSprint: could not save progress.'); persistWarned = true; } }
  }

  function reset() {
    mem = defaultState();
    save();
  }

  function bumpStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const s = mem.streakDays;
    if (s.lastPlayedDate === today) return;
    if (s.lastPlayedDate) {
      const prev = new Date(s.lastPlayedDate);
      const diffDays = Math.round((new Date(today) - prev) / 86400000);
      s.count = diffDays === 1 ? s.count + 1 : 1;
    } else {
      s.count = 1;
    }
    s.lastPlayedDate = today;
  }

  function updateWeakness(charSeen, charMissed, wordSeen, wordMissed) {
    for (const ch in charSeen) {
      const w = mem.weakChars[ch] || { seen: 0, missed: 0, hadBeenWeak: false };
      w.seen += charSeen[ch];
      w.missed += (charMissed[ch] || 0);
      if (w.seen >= 5 && (w.missed / w.seen) > 0.3) w.hadBeenWeak = true;
      mem.weakChars[ch] = w;
    }
    for (const wd in wordSeen) {
      const w = mem.weakWords[wd] || { seen: 0, missed: 0 };
      w.seen += wordSeen[wd];
      w.missed += (wordMissed[wd] || 0);
      mem.weakWords[wd] = w;
    }
  }

  function recordRun(run) {
    bumpStreak();
    mem.totalRaces += 1;
    mem.bestWpm = Math.max(mem.bestWpm, run.wpm);
    mem.bestAccuracy = Math.max(mem.bestAccuracy, run.accuracy);
    mem.history.push(run);
    if (mem.history.length > HISTORY_CAP) mem.history.shift();
    save();
  }

  return { load, save, reset, recordRun, updateWeakness };
})();
