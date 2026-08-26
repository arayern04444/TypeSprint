/* =====================================================================
   Screen renderers — menu difficulty/theme pickers, achievements
   grid, lifetime stats, history table, sparkline SVG, results screen.
   Pure DOM rendering; navigation/event-wiring lives in app.js.
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';
import { ACHIEVEMENTS } from './achievements.js';
import { LENGTHS, TIMED_DURATIONS } from './passages.js';
import { showToast } from './toast.js';
import { icon, iconBadge } from './icons.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' },
  { id: 'code', label: 'Code' }, { id: 'quotes', label: 'Quotes' }, { id: 'auto', label: 'Auto', icon: 'sparkles' },
];

export function renderDifficultyPicker() {
  const s = Store.load();
  const row = document.getElementById('difficulty-row');
  row.innerHTML = '';
  for (const d of DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (s.settings.difficulty === d.id ? ' active' : '');
    btn.innerHTML = (d.icon ? icon(d.icon) + ' ' : '') + d.label;
    btn.addEventListener('click', () => {
      s.settings.difficulty = d.id;
      Store.save();
      renderDifficultyPicker();
    });
    row.appendChild(btn);
  }
}

const RACE_MODES = [
  { id: 'passage', label: 'Classic' },
  { id: 'timed', label: 'Timed' },
];

export function renderRaceModePicker() {
  const s = Store.load();
  const row = document.getElementById('race-mode-row');
  if (!row) return;
  row.innerHTML = '';
  for (const m of RACE_MODES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (s.settings.raceMode === m.id ? ' active' : '');
    btn.textContent = m.label;
    btn.addEventListener('click', () => {
      s.settings.raceMode = m.id;
      Store.save();
      renderRaceModePicker();
      renderLengthPicker(); // the Length card swaps to a Duration card in Timed mode
    });
    row.appendChild(btn);
  }
}

// Doubles as the Length picker (Classic mode) and the Duration picker
// (Timed mode) — same card, same button-row pattern, just swapped
// based on the current race mode, so no new visual language.
export function renderLengthPicker() {
  const s = Store.load();
  const row = document.getElementById('length-row');
  if (!row) return;
  const title = document.getElementById('length-card-title');
  const hint = document.getElementById('length-card-hint');
  row.innerHTML = '';
  if (s.settings.raceMode === 'timed') {
    if (title) title.textContent = 'Duration';
    if (hint) hint.textContent = 'Type for the whole duration. Longer times and harder difficulties earn more keys.';
    for (const d of TIMED_DURATIONS) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (s.settings.timedDuration === d ? ' active' : '');
      btn.textContent = d + 's';
      btn.addEventListener('click', () => {
        s.settings.timedDuration = d;
        Store.save();
        renderLengthPicker();
      });
      row.appendChild(btn);
    }
    return;
  }
  if (title) title.textContent = 'Length';
  if (hint) hint.textContent = 'Longer and harder passages earn more keys.';
  for (const l of LENGTHS) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (s.settings.length === l.id ? ' active' : '');
    btn.textContent = l.name;
    btn.addEventListener('click', () => {
      s.settings.length = l.id;
      Store.save();
      renderLengthPicker();
    });
    row.appendChild(btn);
  }
}

export function renderThemePicker() {
  const s = Store.load();
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = '';
  for (const t of THEMES) {
    const unlocked = Themes.isUnlocked(t.id);
    const wrap = document.createElement('div');
    wrap.className = 'theme-item';
    const sw = document.createElement('div');
    sw.className = 'theme-swatch' + (!unlocked ? ' locked' : '') + (s.settings.theme === t.id ? ' selected' : '');
    sw.setAttribute('data-theme', t.id);
    sw.style.background = `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`;
    sw.innerHTML = `<span class="theme-swatch-icon">${icon(t.icon, { size: '1.7rem' })}</span>` +
      (!unlocked ? `<span class="theme-swatch-lock">${icon('lock', { size: '.85rem' })}</span>` : '');
    if (!unlocked) {
      sw.title = 'Unlock via a chest — visit Rewards';
      sw.addEventListener('click', () => {
        showToast(icon('lock'), `${t.name} is locked`, 'Earn keys by racing, then open a chest in Rewards to unlock new themes!', { info: true, silent: true });
        sw.classList.remove('shake-el');
        void sw.offsetWidth;
        sw.classList.add('shake-el');
      });
    } else {
      sw.addEventListener('click', () => {
        if (Themes.equip(t.id)) renderThemePicker();
      });
    }
    wrap.appendChild(sw);
    const lbl = document.createElement('div');
    lbl.className = 'theme-swatch-label';
    lbl.textContent = t.name;
    wrap.appendChild(lbl);
    grid.appendChild(wrap);
  }
}

export function renderAchievementsGrid() {
  const s = Store.load();
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const unlocked = s.achievements[a.id] && s.achievements[a.id].unlocked;
    const card = document.createElement('div');
    card.className = 'ach-card' + (unlocked ? '' : ' locked');
    const tierClass = a.keyReward >= 50 ? ' tier2' : '';
    card.innerHTML = `<span class="icon-badge ach-badge${tierClass}">${a.icon}</span><div><div class="name">${a.name}
        <span style="color:var(--accent); font-size:.7rem; font-weight:700;">+${a.keyReward} <span class="key-icon" style="width:1.1em;height:1.1em;font-size:.7em;vertical-align:-2px;">K</span></span>
      </div>
      <div class="desc">${a.desc}</div>${unlocked ? `<div class="date">Unlocked ${new Date(s.achievements[a.id].date).toLocaleDateString()}</div>` : ''}</div>`;
    grid.appendChild(card);
  }
}

export function renderHistoryTable() {
  const s = Store.load();
  const wrap = document.getElementById('history-table-wrap');
  if (s.history.length === 0) { wrap.innerHTML = '<div class="empty-state">No races yet — go set a baseline!</div>'; return; }
  const rows = s.history.slice().reverse().map(r => `<tr>
    <td>${new Date(r.date).toLocaleString()}</td><td>${r.wpm}</td><td>${r.accuracy}%</td>
    <td>${r.bestCombo}</td><td>${r.difficulty}</td></tr>`).join('');
  wrap.innerHTML = `<table class="history-table"><thead><tr>
    <th>Date</th><th>WPM</th><th>Accuracy</th><th>Best Combo</th><th>Difficulty</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

export function renderLifetimeStats() {
  const s = Store.load();
  const avgWpm = s.totalRaces > 0 ? Math.round(s.stats.wpmTotal / s.totalRaces) : 0;
  const stats = [
    { v: s.totalRaces, l: 'Total Races' },
    { v: s.stats.perfectRaces, l: 'Perfect Races' },
    { v: avgWpm, l: 'Average WPM' },
    { v: s.bestWpm, l: 'Best WPM' },
    { v: s.bestAccuracy + '%', l: 'Best Accuracy' },
    { v: s.stats.keysEarnedTotal, l: 'Keys Earned' },
    { v: s.stats.chestsOpened, l: 'Chests Opened' },
  ];
  const grid = document.getElementById('lifetime-stats-grid');
  grid.innerHTML = stats.map((st, i) => `<div class="stat-card" style="animation-delay:${i * 0.05}s">
    <div class="v">${st.v}</div><div class="l">${st.l}</div></div>`).join('');
}

export function renderHeaderBadge() {
  const s = Store.load();
  document.getElementById('header-best-wpm').textContent = s.bestWpm;
  document.getElementById('header-keys').textContent = s.keys;
}

export function renderSoundToggle() {
  const s = Store.load();
  document.getElementById('sound-toggle').innerHTML = icon(s.settings.soundOn ? 'speaker' : 'speakerMuted');
}

export function renderSparkline(container, history) {
  const data = history.slice(-20);
  if (data.length < 2) {
    container.innerHTML = '<div class="empty-state">Play a few races to see your trend here.</div>';
    return;
  }
  const w = 300, h = 60, pad = 8;
  const max = Math.max(...data.map(d => d.wpm), 10);
  const min = Math.min(...data.map(d => d.wpm), 0);
  const range = Math.max(max - min, 1);
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d.wpm - min) / range) * (h - pad * 2);
    return { x, y, wpm: d.wpm };
  });
  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const circles = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5"><title>${p.wpm} WPM</title></circle>`).join('');
  container.innerHTML = `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${polyPoints}" />${circles}</svg>`;
}

// The just-finished race's own pacing — one point per second, net WPM
// and raw WPM, with a marker on any second a mistake happened. Distinct
// from renderSparkline above (that one tracks WPM across many *past*
// races, not the internals of a single one) — same hand-rolled inline-
// SVG technique, no charting library.
function renderRaceGraph(container, run) {
  const points = (run.timeline && run.timeline.points) || [];
  if (points.length < 2) { container.innerHTML = ''; return; }
  const errorSeconds = new Set((run.timeline && run.timeline.errorSeconds) || []);
  const w = 600, h = 120, pad = 10;
  const maxWpm = Math.max(...points.map((p) => Math.max(p.wpm, p.raw)), 10);
  const stepX = (w - pad * 2) / (points.length - 1);
  const xAt = (i) => pad + i * stepX;
  const yAt = (wpm) => h - pad - (wpm / maxWpm) * (h - pad * 2);
  const line = (key) => points.map((p, i) => `${xAt(i)},${yAt(p[key])}`).join(' ');
  const errorDots = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => errorSeconds.has(p.t))
    .map(({ p, i }) => `<circle class="err" cx="${xAt(i)}" cy="${yAt(p.wpm)}" r="3.5"><title>Mistake at ${p.t}s</title></circle>`)
    .join('');
  container.innerHTML = `<svg class="race-graph" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline class="raw" points="${line('raw')}" />
    <polyline class="net" points="${line('wpm')}" />
    ${errorDots}
  </svg>`;
}

export function showResults(run, unlocks, keysEarned) {
  const s = Store.load();
  document.getElementById('results-wpm').textContent = run.wpm;
  const prevBest = s.bestWpm === run.wpm && s.history.length > 1 ? Math.max(...s.history.slice(0, -1).map(h => h.wpm), 0) : s.bestWpm;
  const deltaEl = document.getElementById('results-delta');
  const delta = run.wpm - prevBest;
  if (s.history.length <= 1) {
    deltaEl.textContent = 'Your first run — nice baseline!';
    deltaEl.className = 'delta';
  } else if (delta >= 0) {
    deltaEl.textContent = `+${delta} WPM vs your previous best (${prevBest})`;
    deltaEl.className = 'delta up';
  } else {
    deltaEl.textContent = `${delta} WPM vs your best (${prevBest})`;
    deltaEl.className = 'delta down';
  }

  const grid = document.getElementById('results-stat-grid');
  const stats = [
    { v: run.accuracy + '%', l: 'Accuracy' },
    { v: run.rawWpm != null ? run.rawWpm : run.wpm, l: 'Raw WPM' },
    { v: (run.consistency != null ? run.consistency : 100) + '%', l: 'Consistency' },
    { v: run.bestCombo, l: 'Best Combo' },
    { v: run.durationSec + 's', l: 'Duration' },
    { v: run.chars, l: 'Characters' },
    { v: '+' + (keysEarned || 0), l: 'Keys Earned' },
  ];
  grid.innerHTML = stats.map((st, i) => `<div class="stat-card" style="animation-delay:${i * 0.08}s">
    <div class="v">${st.v}</div><div class="l">${st.l}</div></div>`).join('');
  renderRaceGraph(document.getElementById('results-race-graph'), run);

  const unlockWrap = document.getElementById('results-unlocks');
  const chips = unlocks.newlyUnlocked.map(a => `<div class="unlock-chip"><span class="ic">${a.icon}</span>${a.name} (+${a.keyReward} keys)</div>`);
  unlockWrap.innerHTML = chips.length
    ? `<div class="section-title">New unlocks</div><div class="unlock-row">${chips.map((c, i) => c.replace('unlock-chip"', `unlock-chip" style="animation-delay:${i * 0.1}s"`)).join('')}</div>`
    : '';

  renderSparkline(document.getElementById('results-sparkline'), s.history);
  renderHeaderBadge();
}
