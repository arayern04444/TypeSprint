/* =====================================================================
   App — composition root. Wires Router hooks, DOM event listeners, and
   the race:finished -> record/achievements/results pipeline. Loaded
   last (as the page's one <script type="module">) so its imports pull
   in every other module in the right order.
===================================================================== */
import { Store } from './store.js';
import { AudioEngine } from './audio.js';
import { Race } from './race.js';
import { Themes } from './themes.js';
import { pickPassage, adjustAutoTier } from './passages.js';
import { AchievementsEngine } from './achievements.js';
import { Router } from './router.js';
import {
  renderDifficultyPicker, renderThemePicker, renderHeaderBadge, renderSoundToggle,
  renderSparkline, renderHistoryTable, renderAchievementsGrid, renderThemesGrid, showResults,
} from './screens.js';

/* ---- Router hooks ---- */
let countdownHandle = null;

function onMenu() {
  renderDifficultyPicker();
  renderThemePicker();
  renderHeaderBadge();
}

function onCountdown() {
  let n = 3;
  const numEl = document.getElementById('countdown-number');
  numEl.textContent = n;
  AudioEngine.resume();
  AudioEngine.countdownTick();
  countdownHandle = setInterval(() => {
    n -= 1;
    if (n > 0) { numEl.textContent = n; AudioEngine.countdownTick(); }
    else if (n === 0) { numEl.textContent = 'Go!'; AudioEngine.countdownGo(); }
    else { clearInterval(countdownHandle); Router.goTo('race'); }
  }, 700);
}

function onRace() {
  const s = Store.load();
  const passage = pickPassage(s.settings.difficulty);
  Race.load(passage);
}

function onHistory() {
  renderSparkline(document.getElementById('history-sparkline'), Store.load().history);
  renderHistoryTable();
}

function onAchievements() {
  renderAchievementsGrid();
  renderThemesGrid();
}

Router.setHooks({ menu: onMenu, countdown: onCountdown, race: onRace, results: null, history: onHistory, achievements: onAchievements });

/* ---- race:finished pipeline ---- */
window.addEventListener('race:finished', (e) => {
  const run = e.detail;
  Store.recordRun(run);
  adjustAutoTier(run);
  Store.save();
  const unlocks = AchievementsEngine.evaluate(run);
  Router.goTo('results');
  showResults(run, unlocks);
});

/* ---- Button wiring ---- */
document.getElementById('start-race-btn').addEventListener('click', () => { AudioEngine.resume(); Router.goTo('countdown'); });
document.getElementById('retry-btn').addEventListener('click', () => Router.goTo('countdown'));
document.getElementById('results-menu-btn').addEventListener('click', () => Router.goTo('menu'));
document.getElementById('results-history-btn').addEventListener('click', () => Router.goTo('history'));
document.getElementById('goto-history-btn').addEventListener('click', () => Router.goTo('history'));
document.getElementById('goto-achievements-btn').addEventListener('click', () => Router.goTo('achievements'));
document.getElementById('history-back-btn').addEventListener('click', () => Router.goTo('menu'));
document.getElementById('achievements-back-btn').addEventListener('click', () => Router.goTo('menu'));
document.getElementById('race-quit-btn').addEventListener('click', () => { Race.quit(); Router.goTo('menu'); });

document.getElementById('reset-progress-btn').addEventListener('click', () => {
  if (confirm('Reset all progress? This clears your history, achievements, and unlocked themes. This cannot be undone.')) {
    Store.reset();
    Themes.apply('default');
    Router.goTo('menu');
    renderHeaderBadge();
    renderSoundToggle();
  }
});

document.getElementById('sound-toggle').addEventListener('click', () => {
  const s = Store.load();
  s.settings.soundOn = !s.settings.soundOn;
  Store.save();
  renderSoundToggle();
});

window.addEventListener('resize', () => {
  if (document.body.dataset.screen === 'race') {
    // reposition caret on resize/reflow
    const evt = new Event('reflow');
    window.dispatchEvent(evt);
  }
});

/* ---- Init ---- */
(function init() {
  const s = Store.load();
  Themes.apply(s.settings.theme);
  renderSoundToggle();
  renderHeaderBadge();
  Router.goTo('menu');
})();
