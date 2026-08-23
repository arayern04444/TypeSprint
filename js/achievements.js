/* =====================================================================
   Achievements — data-driven badge list + evaluation/unlock engine.
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';
import { showToast } from './toast.js';

function checkWeakSpotFixed(s) {
  for (const ch in s.weakChars) {
    const w = s.weakChars[ch];
    if (w.seen >= 15 && (w.missed / w.seen) < 0.1 && w.hadBeenWeak) return true;
  }
  return false;
}

export const ACHIEVEMENTS = [
  { id: 'first_race', name: 'First Steps', icon: '🏁', desc: 'Complete your first race.',
    check: (run, s) => s.totalRaces >= 1 },
  { id: 'wpm40', name: 'Getting Going', icon: '🚗', desc: 'Reach 40 WPM in a single run.',
    check: (run) => run.wpm >= 40 },
  { id: 'wpm60', name: '60 WPM Club', icon: '🚀', desc: 'Reach 60 WPM in a single run.',
    check: (run) => run.wpm >= 60 },
  { id: 'wpm90', name: 'Speed Demon', icon: '⚡', desc: 'Reach 90 WPM in a single run.',
    check: (run) => run.wpm >= 90 },
  { id: 'perfect_run', name: 'Flawless', icon: '💎', desc: '100% accuracy on a run of 60+ characters.',
    check: (run) => run.accuracy >= 100 && run.chars >= 60 },
  { id: 'combo50', name: 'On Fire', icon: '🔥', desc: 'Reach a 50-keystroke combo streak.',
    check: (run) => run.bestCombo >= 50 },
  { id: 'combo100', name: 'Unstoppable', icon: '💯', desc: 'Reach a 100-keystroke combo streak.',
    check: (run) => run.bestCombo >= 100 },
  { id: 'ten_races', name: 'Warming Up', icon: '📈', desc: 'Complete 10 total races.',
    check: (run, s) => s.totalRaces >= 10 },
  { id: 'fifty_races', name: 'Dedicated', icon: '🏆', desc: 'Complete 50 total races.',
    check: (run, s) => s.totalRaces >= 50 },
  { id: 'streak5', name: '5-Day Streak', icon: '📅', desc: 'Play on 5 days in a row.',
    check: (run, s) => s.streakDays.count >= 5 },
  { id: 'weak_spot_fixed', name: 'Comeback Kid', icon: '💪', desc: 'Turn a weak key into a strength.',
    check: (run, s) => checkWeakSpotFixed(s) },
  { id: 'hard_tier_clear', name: 'Hard Mode', icon: '🛡️', desc: 'Clear a Hard or Code passage at 95%+ accuracy.',
    check: (run) => (run.difficulty === 'hard' || run.difficulty === 'code') && run.accuracy >= 95 },
];

export const AchievementsEngine = {
  evaluate(run) {
    const s = Store.load();
    const newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id] && s.achievements[a.id].unlocked) continue;
      if (a.check(run, s)) {
        s.achievements[a.id] = { unlocked: true, date: new Date().toISOString() };
        newlyUnlocked.push(a);
      }
    }
    const newThemes = [];
    for (const t of THEMES) {
      if (t.unlockedBy && s.achievements[t.unlockedBy] && s.achievements[t.unlockedBy].unlocked && !Themes.isUnlocked(t.id)) {
        Themes.unlock(t.id);
        newThemes.push(t);
      }
    }
    Store.save();
    newlyUnlocked.forEach((a, i) => setTimeout(() => showToast(a.icon, a.name + ' unlocked!', a.desc), i * 500));
    return { newlyUnlocked, newThemes };
  },
};
