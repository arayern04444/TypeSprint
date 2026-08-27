/* =====================================================================
   Leaderboard UI — the standalone Leaderboard screen (filterable top
   list) and the "Submit to Leaderboard" affordance on the solo results
   screen. Leaderboard (leaderboard.js) owns the actual Supabase calls;
   this just renders and wires DOM events, same split as
   multiplayer.js/multiplayer-ui.js.
===================================================================== */
import { Leaderboard } from './leaderboard.js';
import { Auth } from './auth.js';
import { Router } from './router.js';
import { showToast } from './toast.js';
import { icon } from './icons.js';
import { TIMED_DURATIONS } from './passages.js';

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const LB_DIFFICULTIES = [
  { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' },
  { id: 'code', label: 'Code' }, { id: 'quotes', label: 'Quotes' },
];
const LB_MODES = [
  { id: 'passage', label: 'Classic' }, { id: 'timed', label: 'Timed' },
];
const MEDAL_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

const filter = { difficulty: 'easy', raceMode: 'passage', timedDurationSec: 30 };
let pendingRun = null;

/* ---- standalone leaderboard screen ---- */
function renderDifficultyRow() {
  const row = el('leaderboard-difficulty-row');
  row.innerHTML = '';
  for (const d of LB_DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (filter.difficulty === d.id ? ' active' : '');
    btn.textContent = d.label;
    btn.addEventListener('click', () => { filter.difficulty = d.id; renderDifficultyRow(); loadAndRenderList(); });
    row.appendChild(btn);
  }
}

function renderModeRow() {
  const row = el('leaderboard-mode-row');
  row.innerHTML = '';
  for (const m of LB_MODES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (filter.raceMode === m.id ? ' active' : '');
    btn.textContent = m.label;
    btn.addEventListener('click', () => { filter.raceMode = m.id; renderModeRow(); renderDurationRow(); loadAndRenderList(); });
    row.appendChild(btn);
  }
}

function renderDurationRow() {
  const row = el('leaderboard-duration-row');
  row.innerHTML = '';
  row.style.display = filter.raceMode === 'timed' ? 'flex' : 'none';
  if (filter.raceMode !== 'timed') return;
  for (const d of TIMED_DURATIONS) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (filter.timedDurationSec === d ? ' active' : '');
    btn.textContent = d + 's';
    btn.addEventListener('click', () => { filter.timedDurationSec = d; renderDurationRow(); loadAndRenderList(); });
    row.appendChild(btn);
  }
}

async function loadAndRenderList() {
  const list = el('leaderboard-list');
  list.innerHTML = '<div class="empty-state">Loading…</div>';
  const rows = await Leaderboard.fetchTop(filter);
  list.innerHTML = rows.length
    ? rows.map((r, i) => `<div class="row" style="justify-content:space-between; padding:.6rem 0; border-bottom:1px solid var(--border);">
        <span>${i < 3 ? `<span style="color:${MEDAL_COLORS[i]}">${icon('medal')}</span> ` : (i + 1) + '. '}${escapeHtml(r.nickname)}</span>
        <span>${Math.round(r.wpm)} WPM · ${Math.round(r.accuracy)}%</span>
      </div>`).join('')
    : '<div class="empty-state">No scores yet for this filter — be the first!</div>';
}

export async function renderLeaderboardScreen() {
  // Browsing needs a session but not a nickname — this is silent and
  // never prompts (only "Submit to Leaderboard" on results does).
  await Leaderboard.ensureViewerSession();
  renderDifficultyRow();
  renderModeRow();
  renderDurationRow();
  loadAndRenderList();
}

/* ---- automatic Top-100 detection on the solo results screen ---- */
function showLeaderboardCard(html) {
  el('results-leaderboard-card').style.display = 'block';
  el('results-leaderboard-status').innerHTML = html;
}

function hideLeaderboardCard() {
  el('results-leaderboard-card').style.display = 'none';
}

// `silent` — used for the fully-automatic path (a nickname already
// exists, nothing the player did prompted this attempt): a backend
// hiccup there should degrade quietly rather than surface a scary
// error on a screen the player didn't ask anything of. The one
// interactive path (just typed a name and hit "Claim Spot") still
// shows a real error, since that follows an explicit action.
async function doAutoSubmit(run, { silent } = {}) {
  const { error } = await Leaderboard.submit(run);
  if (error) {
    if (silent) console.warn('TypeSprint: leaderboard auto-submit failed:', error.message);
    else el('results-leaderboard-error').textContent = error.message;
    return;
  }
  const modeLabel = run.timedDurationSec ? `Timed ${run.timedDurationSec}s` : 'Classic';
  showLeaderboardCard(`${icon('medal')} You made the Top 100 for ${run.difficulty} · ${modeLabel} — added automatically!`);
  showToast(icon('medal'), 'Top 100!', 'Your run was added to the leaderboard.', { info: true, silent: true });
}

// Called by app.js's race:finished handler right after a solo race —
// no button to click. Checks whether this run would actually place in
// the Top 100 for its own (difficulty, mode, duration) bucket, and
// submits it automatically if so. The only time this is ever
// interactive is a player's very first qualifying run, when there's no
// guest nickname yet to submit under — nothing else to do about that,
// there's genuinely no identity to attach the score to otherwise.
export async function checkAndAutoSubmit(run) {
  pendingRun = run;
  hideLeaderboardCard();
  el('results-leaderboard-nickname-row').style.display = 'none';
  el('results-leaderboard-error').textContent = '';

  const raceMode = run.timedDurationSec ? 'timed' : 'passage';
  const top = await Leaderboard.fetchTop({ raceMode, difficulty: run.difficulty, timedDurationSec: run.timedDurationSec, limit: 100 });
  const qualifies = top.length < 100 || run.wpm > top[top.length - 1].wpm;
  if (!qualifies) return; // not Top 100 yet this run — nothing to show, no clutter

  if (Auth.isSignedIn && Auth.nickname) {
    await doAutoSubmit(run, { silent: true });
    return;
  }
  showLeaderboardCard(`${icon('medal')} You're Top 100 material! Pick a nickname to claim your spot:`);
  el('results-leaderboard-nickname-row').style.display = 'flex';
}

export function initLeaderboardUI() {
  el('leaderboard-back-btn').addEventListener('click', () => Router.goTo('menu'));

  el('results-leaderboard-confirm-btn').addEventListener('click', async () => {
    const nickname = el('results-leaderboard-nickname').value.trim();
    if (nickname.length < 2) { el('results-leaderboard-error').textContent = 'Pick a name (2+ characters) first.'; return; }
    const { error } = await Auth.playAsGuest(nickname);
    if (error) { el('results-leaderboard-error').textContent = error.message; return; }
    el('results-leaderboard-nickname-row').style.display = 'none';
    if (pendingRun) await doAutoSubmit(pendingRun);
  });
}
