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
import { icon } from './icons.js';
import { pickPassage, adjustAutoTier } from './passages.js';
import { AchievementsEngine } from './achievements.js';
import { Router } from './router.js';
import {
  renderDifficultyPicker, renderLengthPicker, renderThemePicker, renderHeaderBadge, renderSoundToggle,
  renderSparkline, renderHistoryTable, renderLifetimeStats, renderAchievementsGrid, showResults,
} from './screens.js';
import { initRewardsUI, renderRewardsScreen } from './rewards-ui.js';
import { showToast } from './toast.js';
import { Auth } from './auth.js';
import { Multiplayer } from './multiplayer.js';
import {
  initMultiplayerUI, renderMultiplayerHome, renderRoomScreen, renderMultiplayerResultsScreen,
  enterMultiplayerRace, applyPendingRoomCodeFromUrl,
} from './multiplayer-ui.js';

const KEY_TOAST_ICON = '<span class="key-icon" style="width:1.4em;height:1.4em;">K</span>';

function accountBadgeLabel() {
  return Auth.isSignedIn && Auth.nickname ? Auth.nickname : 'Play Online';
}

function renderAccountBadge() {
  document.getElementById('account-badge').innerHTML = icon('person') + ' ' + accountBadgeLabel();
}

/* ---- Router hooks ---- */
let countdownHandle = null;

function onMenu() {
  renderDifficultyPicker();
  renderLengthPicker();
  renderThemePicker();
  renderHeaderBadge();
}

function runFixedCountdown() {
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

// Counts down to a shared absolute timestamp (ms) instead of a fixed
// local duration, so every player's countdown lands on "Go!" at the
// same instant regardless of when the start signal reached them.
function runSyncedCountdown(targetMs) {
  const numEl = document.getElementById('countdown-number');
  AudioEngine.resume();
  let lastShown = null;
  let goFired = false;
  if (countdownHandle) clearInterval(countdownHandle);
  countdownHandle = setInterval(() => {
    const remainingMs = targetMs - Date.now();
    if (remainingMs <= 0) {
      if (!goFired) {
        goFired = true;
        numEl.textContent = 'Go!';
        AudioEngine.countdownGo();
        setTimeout(() => { clearInterval(countdownHandle); enterMultiplayerRace(); }, 500);
      }
      return;
    }
    const remainingSec = Math.ceil(remainingMs / 1000);
    if (remainingSec !== lastShown) {
      lastShown = remainingSec;
      numEl.textContent = remainingSec;
      AudioEngine.countdownTick();
    }
  }, 100);
}

function onCountdown() {
  const room = Multiplayer.room;
  if (room && room.race_start_at) {
    runSyncedCountdown(new Date(room.race_start_at).getTime());
  } else {
    runFixedCountdown();
  }
}

function onRace() {
  if (Multiplayer.room) return; // multiplayer entry is driven by enterMultiplayerRace() instead
  document.getElementById('mp-track').classList.remove('active');
  const s = Store.load();
  const passage = pickPassage(s.settings.difficulty, s.settings.length);
  Race.load(passage);
}

function onHistory() {
  renderSparkline(document.getElementById('history-sparkline'), Store.load().history);
  renderHistoryTable();
  renderLifetimeStats();
}

function onAchievements() {
  renderAchievementsGrid();
}

Router.setHooks({
  menu: onMenu, countdown: onCountdown, race: onRace, results: null, history: onHistory,
  achievements: onAchievements, rewards: renderRewardsScreen, 'multiplayer-home': renderMultiplayerHome,
  room: renderRoomScreen, 'race-multiplayer-results': renderMultiplayerResultsScreen,
});

/* ---- race:finished pipeline ---- */
window.addEventListener('race:finished', async (e) => {
  const run = e.detail;
  // Local stats/achievements/history apply to every race, solo or multiplayer.
  const { keysEarned, isPerfect } = Store.recordRun(run);
  adjustAutoTier(run);
  Store.save();
  const unlocks = AchievementsEngine.evaluate(run);
  showToast(KEY_TOAST_ICON, `+${keysEarned} Keys`, isPerfect ? 'Flawless run bonus!' : 'Race complete', { silent: true });
  renderHeaderBadge();

  if (run.mode === 'multiplayer') {
    await Multiplayer.submitResult(run);
    Router.goTo('race-multiplayer-results');
  } else {
    Router.goTo('results');
    showResults(run, unlocks, keysEarned);
  }
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

document.getElementById('race-quit-btn').addEventListener('click', async () => {
  Race.quit();
  if (Multiplayer.room) {
    await Multiplayer.leaveRoom();
    Router.goTo('multiplayer-home');
  } else {
    Router.goTo('menu');
  }
});

document.getElementById('reset-progress-btn').addEventListener('click', () => {
  if (confirm('Reset all progress? This clears your history, achievements, keys, and unlocked themes/sounds/cars. This cannot be undone.')) {
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

document.getElementById('account-badge').addEventListener('click', () => Router.goTo('multiplayer-home'));
Auth.onChange(renderAccountBadge);

window.addEventListener('resize', () => {
  if (document.body.dataset.screen === 'race') {
    // reposition caret on resize/reflow
    const evt = new Event('reflow');
    window.dispatchEvent(evt);
  }
});

/* ---- Init ---- */
(async function init() {
  // One-time fill for static nav icons (History/Achievements/Rewards/
  // Multiplayer) — anything whose icon never changes after first paint.
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

  const s = Store.load();
  Themes.apply(s.settings.theme);
  renderSoundToggle();
  renderHeaderBadge();
  renderAccountBadge();
  initMultiplayerUI();
  initRewardsUI();
  Router.goTo('menu');
  // Session restore can take a moment (network round-trip); the UI is
  // already usable for solo play before this resolves.
  await Auth.init();
  renderAccountBadge();
  applyPendingRoomCodeFromUrl();
})();
