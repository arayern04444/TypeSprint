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

/* ---- "Submit to Leaderboard" on the solo results screen ---- */
// Called by app.js's race:finished handler right before showResults(),
// so the submit button always has the run it'd actually submit.
export function setPendingSubmitRun(run) {
  pendingRun = run;
  el('results-leaderboard-nickname-row').style.display = 'none';
  el('results-leaderboard-error').textContent = '';
  const btn = el('results-leaderboard-submit-btn');
  btn.style.display = 'inline-flex';
  btn.disabled = false;
  btn.innerHTML = icon('medal') + ' Submit to Leaderboard';
}

async function doSubmit() {
  if (!pendingRun) return;
  const btn = el('results-leaderboard-submit-btn');
  btn.disabled = true;
  const { error } = await Leaderboard.submit(pendingRun);
  if (error) {
    el('results-leaderboard-error').textContent = error.message;
    btn.disabled = false;
    return;
  }
  btn.innerHTML = icon('check') + ' Submitted!';
  el('results-leaderboard-nickname-row').style.display = 'none';
  showToast(icon('medal'), 'Submitted!', 'Your run is on the leaderboard.', { info: true, silent: true });
}

export function initLeaderboardUI() {
  el('leaderboard-back-btn').addEventListener('click', () => Router.goTo('menu'));

  el('results-leaderboard-submit-btn').addEventListener('click', () => {
    if (!pendingRun) return;
    if (Auth.isSignedIn && Auth.nickname) { doSubmit(); return; }
    // No guest identity yet (never played multiplayer/leaderboard
    // before) — reveal a small inline nickname field, same idea as
    // multiplayer's own nickname prompt, just relocated here.
    el('results-leaderboard-nickname').value = '';
    el('results-leaderboard-error').textContent = '';
    el('results-leaderboard-nickname-row').style.display = 'flex';
  });

  el('results-leaderboard-confirm-btn').addEventListener('click', async () => {
    const nickname = el('results-leaderboard-nickname').value.trim();
    if (nickname.length < 2) { el('results-leaderboard-error').textContent = 'Pick a name (2+ characters) first.'; return; }
    const { error } = await Auth.playAsGuest(nickname);
    if (error) { el('results-leaderboard-error').textContent = error.message; return; }
    await doSubmit();
  });
}
