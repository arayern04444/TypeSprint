/* =====================================================================
   Multiplayer UI — the Among-Us-style entry flow: pick a name, then
   Create or Join a room by code; the lobby (live player list, host
   Start); the visual car-track race overlay; and the results
   leaderboard. Wires DOM events; Multiplayer (multiplayer.js) and
   Auth (auth.js) own all actual state.
===================================================================== */
import { Auth } from './auth.js';
import { Multiplayer } from './multiplayer.js';
import { Router } from './router.js';
import { Race } from './race.js';
import { pickPassage } from './passages.js';
import { showToast } from './toast.js';

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---- Create Game difficulty picker (no "Auto" — that only makes sense solo) ---- */
const MP_DIFFICULTIES = [
  { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' },
  { id: 'code', label: 'Code' }, { id: 'quotes', label: 'Quotes' },
];
let selectedTier = 'easy';

function renderDifficultyRow() {
  const row = el('mph-difficulty-row');
  row.innerHTML = '';
  for (const d of MP_DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (selectedTier === d.id ? ' active' : '');
    btn.textContent = d.label;
    btn.addEventListener('click', () => { selectedTier = d.id; renderDifficultyRow(); });
    row.appendChild(btn);
  }
}

function setError(id, message) { el(id).textContent = message || ''; }

/* ---- multiplayer-home ---- */
export function renderMultiplayerHome() {
  el('mph-nickname').value = Auth.nickname || '';
  renderDifficultyRow();
  setError('mph-create-error', '');
  setError('mph-join-error', '');
}

async function ensureNickname(errorFieldId) {
  const nickname = el('mph-nickname').value.trim();
  if (nickname.length < 2) { setError(errorFieldId, 'Pick a name (2+ characters) first.'); return null; }
  const { error } = await Auth.playAsGuest(nickname);
  if (error) { setError(errorFieldId, error.message); return null; }
  return nickname;
}

/* ---- room (lobby) ---- */
function renderPlayerList() {
  const wrap = el('room-player-list');
  const myUid = Auth.session && Auth.session.user.id;
  const hostId = Multiplayer.room && Multiplayer.room.host_id;
  const rows = [];
  for (const [uid, p] of Multiplayer.players) {
    rows.push(`<div class="row" style="justify-content:space-between; align-items:center; padding:.5rem 0; border-bottom:1px solid var(--border);">
      <span>${uid === hostId ? '👑 ' : ''}${escapeHtml(p.nickname)}${uid === myUid ? ' (You)' : ''}</span>
      <span style="color:${p.ready ? 'var(--correct)' : 'var(--fg-dim)'}">${p.ready ? '✓ Ready' : 'Not ready'}</span>
    </div>`);
  }
  wrap.innerHTML = rows.join('') || '<div class="empty-state">Waiting for players…</div>';
}

export function renderRoomScreen() {
  const room = Multiplayer.room;
  if (!room) { Router.goTo('multiplayer-home'); return; }
  el('room-code-display').textContent = room.code;
  el('room-difficulty-label').textContent = 'Difficulty: ' + room.passage_difficulty;
  el('room-start-btn').style.display = Multiplayer.isHost ? 'inline-flex' : 'none';
  el('room-ready-btn').style.display = Multiplayer.isHost ? 'none' : 'inline-flex';
  setError('room-error', '');
  renderPlayerList();
}

/* ---- car track ---- */
function buildTrack() {
  const track = el('mp-track');
  track.innerHTML = '';
  const myUid = Auth.session && Auth.session.user.id;
  for (const [uid, p] of Multiplayer.players) {
    const lane = document.createElement('div');
    lane.className = 'mp-lane';
    lane.dataset.user = uid;
    lane.innerHTML = `<div class="mp-lane-label${uid === myUid ? ' self' : ''}">${escapeHtml(p.nickname)}${uid === myUid ? ' (You)' : ''}</div>
      <div class="mp-lane-track"><div class="mp-car">🏎️</div></div>`;
    track.appendChild(lane);
  }
  track.classList.add('active');
}

function updateCarPosition(uid, fraction, done) {
  const car = document.querySelector(`.mp-lane[data-user="${uid}"] .mp-car`);
  if (!car) return;
  car.style.left = Math.min(96, Math.max(0, fraction * 96)) + '%';
  if (done) car.classList.add('finished');
}

/* ---- entering the live race ---- */
function enterMultiplayerRace() {
  const room = Multiplayer.room;
  buildTrack();
  const myUid = Auth.session.user.id;
  Race.setProgressHandler((state) => {
    const fraction = state.pos / state.textLength;
    updateCarPosition(myUid, fraction, state.done);
    Multiplayer.sendProgress({ pos: state.pos, wpm: state.wpm, accuracy: state.accuracy, done: state.done });
  });
  Race.load({ text: room.passage_text, difficulty: room.passage_difficulty, mode: 'multiplayer' });
  Router.goTo('race');
}

/* ---- results (leaderboard) ---- */
let resultsRows = [];

function renderResultsRows() {
  const wrap = el('mp-results-list');
  const sorted = resultsRows.slice().sort((a, b) => b.wpm - a.wpm);
  wrap.innerHTML = sorted.length
    ? sorted.map((r, i) => `<div class="row" style="justify-content:space-between; padding:.6rem 0; border-bottom:1px solid var(--border);">
        <span>${i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : (i + 1) + '. '}${escapeHtml(r.nickname)}</span>
        <span>${Math.round(r.wpm)} WPM · ${Math.round(r.accuracy)}%</span>
      </div>`).join('')
    : '<div class="empty-state">Waiting for results…</div>';
}

export async function renderMultiplayerResultsScreen() {
  resultsRows = await Multiplayer.fetchResults();
  renderResultsRows();
}

/* ---- init / wiring ---- */
export function initMultiplayerUI() {
  el('goto-multiplayer-btn').addEventListener('click', () => Router.goTo('multiplayer-home'));
  el('mph-back-btn').addEventListener('click', () => Router.goTo('menu'));

  el('mph-create-btn').addEventListener('click', async () => {
    setError('mph-create-error', '');
    const nickname = await ensureNickname('mph-create-error');
    if (!nickname) return;
    el('mph-create-btn').disabled = true;
    const passage = pickPassage(selectedTier);
    const { error } = await Multiplayer.createRoom(passage);
    el('mph-create-btn').disabled = false;
    if (error) { setError('mph-create-error', error.message); return; }
    Router.goTo('room');
  });

  el('mph-join-btn').addEventListener('click', async () => {
    setError('mph-join-error', '');
    const nickname = await ensureNickname('mph-join-error');
    if (!nickname) return;
    el('mph-join-btn').disabled = true;
    const { error } = await Multiplayer.joinRoom(el('mph-join-code').value);
    el('mph-join-btn').disabled = false;
    if (error) { setError('mph-join-error', error.message); return; }
    Router.goTo('room');
  });

  el('room-leave-btn').addEventListener('click', async () => {
    await Multiplayer.leaveRoom();
    Router.goTo('multiplayer-home');
  });

  el('room-copy-link-btn').addEventListener('click', async () => {
    const room = Multiplayer.room;
    if (!room) return;
    const link = location.origin + location.pathname + '?room=' + room.code;
    try {
      await navigator.clipboard.writeText(link);
      showToast('🔗', 'Link copied', link, { info: true, silent: true });
    } catch (e) {
      showToast('🔗', 'Room code', room.code, { info: true, silent: true });
    }
  });

  el('room-start-btn').addEventListener('click', () => Multiplayer.startRace());

  let ready = false;
  el('room-ready-btn').addEventListener('click', () => {
    ready = !ready;
    Multiplayer.setReady(ready);
    el('room-ready-btn').textContent = ready ? "I'm Ready ✓" : "I'm Ready";
    el('room-ready-btn').classList.toggle('active', ready);
  });

  el('mp-results-back-btn').addEventListener('click', async () => {
    await Multiplayer.leaveRoom();
    Router.goTo('menu');
  });

  Multiplayer.onPlayersChange(() => {
    if (document.body.dataset.screen === 'room') renderPlayerList();
  });

  Multiplayer.onRoomStatus(({ status }) => {
    if (status === 'countdown') Router.goTo('countdown');
  });

  Multiplayer.onProgress((payload) => {
    const room = Multiplayer.room;
    if (!room) return;
    const fraction = payload.pos / room.passage_text.length;
    updateCarPosition(payload.userId, fraction, payload.done);
  });

  Multiplayer.onResults((row) => {
    if (!resultsRows.find((r) => r.user_id === row.user_id)) resultsRows.push(row);
    if (document.body.dataset.screen === 'race-multiplayer-results') renderResultsRows();
  });
}

export { enterMultiplayerRace };

/* ---- deep-link join (?room=CODE) ---- */
export function applyPendingRoomCodeFromUrl() {
  const code = new URLSearchParams(location.search).get('room');
  if (!code) return;
  history.replaceState(null, '', location.pathname);
  Router.goTo('multiplayer-home');
  el('mph-join-code').value = code.toUpperCase();
}
