/* =====================================================================
   Store — localStorage persistence for solo/local game state.
   Namespaced under STORAGE_KEY, with an in-memory fallback if storage
   is unavailable (e.g. private browsing, sandboxed preview contexts).
===================================================================== */

const STORAGE_KEY = 'typingGame.v1';
const HISTORY_CAP = 100;

const PERFECT_RACE_KEYS = 10;
const MISTAKE_RACE_KEYS = 5;

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Recursively fills in any field missing from `loaded` using `defaults`,
// at any nesting depth — not just the top level. This is what actually
// guarantees a save survives every future update: adding a new field
// anywhere in defaultState() (however deeply nested) is automatically
// safe for existing saves with zero migration code required per field.
// Arrays and primitives in `loaded` always win over the default; only
// plain objects get merged instead of replaced wholesale.
function mergeDefaults(defaults, loaded) {
  const result = Object.assign({}, defaults);
  for (const key in loaded) {
    const loadedVal = loaded[key];
    const defaultVal = defaults[key];
    result[key] = (isPlainObject(loadedVal) && isPlainObject(defaultVal))
      ? mergeDefaults(defaultVal, loadedVal)
      : loadedVal;
  }
  return result;
}

function defaultState() {
  return {
    version: 1,
    settings: { theme: 'default', difficulty: 'easy', soundOn: true, soundPack: 'default', car: 'default' },
    bestWpm: 0,
    bestAccuracy: 0,
    totalRaces: 0,
    history: [],
    weakChars: {},
    weakWords: {},
    achievements: {},
    unlockedThemes: ['default'],
    unlockedSoundPacks: ['default'],
    unlockedCars: ['default'],
    streakDays: { count: 0, lastPlayedDate: null },
    keys: 0,
    stats: { perfectRaces: 0, wpmTotal: 0, keysEarnedTotal: 0, chestsOpened: 0 },
  };
}

export const Store = (function () {
  let mem = null;
  let persistWarned = false;

  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      mem = raw ? mergeDefaults(defaultState(), JSON.parse(raw)) : defaultState();
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

  function addKeys(amount) {
    mem.keys += amount;
    mem.stats.keysEarnedTotal += amount;
  }

  function recordRun(run) {
    bumpStreak();
    mem.totalRaces += 1;
    mem.bestWpm = Math.max(mem.bestWpm, run.wpm);
    mem.bestAccuracy = Math.max(mem.bestAccuracy, run.accuracy);
    mem.history.push(run);
    if (mem.history.length > HISTORY_CAP) mem.history.shift();
    mem.stats.wpmTotal += run.wpm;
    const isPerfect = run.accuracy >= 100;
    if (isPerfect) mem.stats.perfectRaces += 1;
    const keysEarned = isPerfect ? PERFECT_RACE_KEYS : MISTAKE_RACE_KEYS;
    addKeys(keysEarned);
    save();
    return { keysEarned, isPerfect };
  }

  return { load, save, reset, recordRun, updateWeakness, addKeys };
})();
