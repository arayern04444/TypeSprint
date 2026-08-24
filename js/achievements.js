/* =====================================================================
   Achievements — data-driven badge list + evaluation/unlock engine.
   Achievements pay out Keys (the chest currency) on unlock; they no
   longer directly gate any cosmetic — all cosmetics come from chests
   (see cosmetics.js). Key rewards are tiered by genuine difficulty:
   25 for the easier badges, 50 for the harder milestones.
===================================================================== */
import { Store } from './store.js';
import { showToast } from './toast.js';
import { icon } from './icons.js';

function checkWeakSpotFixed(s) {
  for (const ch in s.weakChars) {
    const w = s.weakChars[ch];
    if (w.seen >= 15 && (w.missed / w.seen) < 0.1 && w.hadBeenWeak) return true;
  }
  return false;
}

export const ACHIEVEMENTS = [
  { id: 'first_race', name: 'First Steps', icon: icon('flag'), desc: 'Complete your first race.', keyReward: 25,
    check: (run, s) => s.totalRaces >= 1 },
  { id: 'wpm40', name: 'Getting Going', icon: icon('trendingUp'), desc: 'Reach 40 WPM in a single run.', keyReward: 25,
    check: (run) => run.wpm >= 40 },
  { id: 'wpm60', name: '60 WPM Club', icon: icon('rocket'), desc: 'Reach 60 WPM in a single run.', keyReward: 50,
    check: (run) => run.wpm >= 60 },
  { id: 'wpm90', name: 'Speed Demon', icon: icon('bolt'), desc: 'Reach 90 WPM in a single run.', keyReward: 50,
    check: (run) => run.wpm >= 90 },
  { id: 'perfect_run', name: 'Flawless', icon: icon('gem'), desc: '100% accuracy on a run of 60+ characters.', keyReward: 25,
    check: (run) => run.accuracy >= 100 && run.chars >= 60 },
  { id: 'combo50', name: 'On Fire', icon: icon('flame'), desc: 'Reach a 50-keystroke combo streak.', keyReward: 25,
    check: (run) => run.bestCombo >= 50 },
  { id: 'combo100', name: 'Unstoppable', icon: icon('target'), desc: 'Reach a 100-keystroke combo streak.', keyReward: 50,
    check: (run) => run.bestCombo >= 100 },
  { id: 'ten_races', name: 'Warming Up', icon: icon('barChart'), desc: 'Complete 10 total races.', keyReward: 25,
    check: (run, s) => s.totalRaces >= 10 },
  { id: 'fifty_races', name: 'Dedicated', icon: icon('trophy'), desc: 'Complete 50 total races.', keyReward: 50,
    check: (run, s) => s.totalRaces >= 50 },
  { id: 'streak5', name: '5-Day Streak', icon: icon('calendar'), desc: 'Play on 5 days in a row.', keyReward: 50,
    check: (run, s) => s.streakDays.count >= 5 },
  { id: 'weak_spot_fixed', name: 'Comeback Kid', icon: icon('refresh'), desc: 'Turn a weak key into a strength.', keyReward: 25,
    check: (run, s) => checkWeakSpotFixed(s) },
  { id: 'hard_tier_clear', name: 'Hard Mode', icon: icon('shield'), desc: 'Clear a Hard or Code passage at 95%+ accuracy.', keyReward: 50,
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
        Store.addKeys(a.keyReward);
        newlyUnlocked.push(a);
      }
    }
    Store.save();
    newlyUnlocked.forEach((a, i) => setTimeout(() =>
      showToast(a.icon, a.name + ' unlocked!', a.desc + ` (+${a.keyReward} keys)`), i * 500));
    return { newlyUnlocked };
  },
};
