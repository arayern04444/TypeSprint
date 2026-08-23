/* =====================================================================
   Screen renderers — menu difficulty/theme pickers, achievements &
   themes galleries, history table, sparkline SVG, results screen.
   Pure DOM rendering; navigation/event-wiring lives in app.js.
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';
import { ACHIEVEMENTS } from './achievements.js';
import { showToast } from './toast.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' },
  { id: 'code', label: 'Code' }, { id: 'quotes', label: 'Quotes' }, { id: 'auto', label: 'Auto ✨' },
];

export function renderDifficultyPicker() {
  const s = Store.load();
  const row = document.getElementById('difficulty-row');
  row.innerHTML = '';
  for (const d of DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (s.settings.difficulty === d.id ? ' active' : '');
    btn.textContent = d.label;
    btn.addEventListener('click', () => {
      s.settings.difficulty = d.id;
      Store.save();
      renderDifficultyPicker();
    });
    row.appendChild(btn);
  }
}

function themeAccentPreview(id) {
  const map = {
    default: '#7c8cff, #ff7ce0', neon: '#00f0ff, #ff00e5',
    sunset: '#ff8a5c, #ff5c9a', matrix: '#39ff5e, #061206',
    mono: '#ffffff, #6e6e72',
  };
  return map[id] || '#7c8cff, #ff7ce0';
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
    sw.style.background = `linear-gradient(135deg, ${themeAccentPreview(t.id)})`;
    const reqAch = ACHIEVEMENTS.find(a => a.id === t.unlockedBy);
    if (!unlocked) {
      sw.innerHTML = '<span class="lock">🔒</span>';
      sw.title = reqAch ? `Unlock: ${reqAch.name} — ${reqAch.desc}` : '';
      sw.addEventListener('click', () => {
        showToast('🔒', `${t.name} is locked`, reqAch ? reqAch.desc : 'Keep playing to unlock this theme.', { info: true, silent: true });
        sw.classList.remove('shake-el');
        void sw.offsetWidth;
        sw.classList.add('shake-el');
      });
    } else {
      sw.addEventListener('click', () => {
        if (Themes.equip(t.id)) { renderThemePicker(); renderThemesGrid(); }
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
    card.innerHTML = `<span class="ic">${a.icon}</span><div><div class="name">${a.name}</div>
      <div class="desc">${a.desc}</div>${unlocked ? `<div class="date">Unlocked ${new Date(s.achievements[a.id].date).toLocaleDateString()}</div>` : ''}</div>`;
    grid.appendChild(card);
  }
}

export function renderThemesGrid() {
  const grid = document.getElementById('themes-grid');
  grid.innerHTML = '';
  for (const t of THEMES) {
    const unlocked = Themes.isUnlocked(t.id);
    const reqAch = ACHIEVEMENTS.find(a => a.id === t.unlockedBy);
    const card = document.createElement('div');
    card.className = 'ach-card' + (unlocked ? '' : ' locked');
    card.innerHTML = `<span class="ic">🎨</span><div><div class="name">${t.name}</div>
      <div class="desc">${unlocked ? 'Unlocked — equip it from the Menu.' : 'Unlock: ' + (reqAch ? reqAch.name : '')}</div></div>`;
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

export function renderHeaderBadge() {
  document.getElementById('header-best-wpm').textContent = Store.load().bestWpm;
}

export function renderSoundToggle() {
  const s = Store.load();
  document.getElementById('sound-toggle').textContent = s.settings.soundOn ? '🔊' : '🔇';
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

export function showResults(run, unlocks) {
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
    { v: run.bestCombo, l: 'Best Combo' },
    { v: run.durationSec + 's', l: 'Duration' },
    { v: run.chars, l: 'Characters' },
  ];
  grid.innerHTML = stats.map((st, i) => `<div class="stat-card" style="animation-delay:${i * 0.08}s">
    <div class="v">${st.v}</div><div class="l">${st.l}</div></div>`).join('');

  const unlockWrap = document.getElementById('results-unlocks');
  const chips = [];
  unlocks.newlyUnlocked.forEach(a => chips.push(`<div class="unlock-chip"><span class="ic">${a.icon}</span>${a.name}</div>`));
  unlocks.newThemes.forEach(t => chips.push(`<div class="unlock-chip"><span class="ic">🎨</span>${t.name} theme unlocked</div>`));
  unlockWrap.innerHTML = chips.length
    ? `<div class="section-title">New unlocks</div><div class="unlock-row">${chips.map((c, i) => c.replace('unlock-chip"', `unlock-chip" style="animation-delay:${i * 0.1}s"`)).join('')}</div>`
    : '';

  renderSparkline(document.getElementById('results-sparkline'), s.history);
  renderHeaderBadge();
}
