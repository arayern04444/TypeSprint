/* =====================================================================
   Rewards UI — the `rewards` screen: keys balance, chest opening +
   a shake-then-burst-open reveal animation, and the three equippable
   cosmetic galleries (themes, sound packs, cars).
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';
import { Cosmetics, SOUND_PACKS, CARS } from './cosmetics.js';
import { AudioEngine } from './audio.js';
import { showToast } from './toast.js';
import { Router } from './router.js';
import { renderHeaderBadge } from './screens.js';
import { icon } from './icons.js';

function el(id) { return document.getElementById(id); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CATEGORY_FALLBACK_ICON = { theme: 'palette', soundPack: 'speaker', car: 'racer' };
function itemIcon(category, item) {
  return item.emoji || icon(CATEGORY_FALLBACK_ICON[category] || 'star');
}

function renderGallery(containerId, category, list, equip, isEquipped) {
  const grid = el(containerId);
  grid.innerHTML = '';
  for (const item of list) {
    const unlocked = Cosmetics.isUnlocked(category, item.id);
    const equipped = isEquipped(item.id);
    const card = document.createElement('div');
    card.className = 'ach-card' + (unlocked ? '' : ' locked');
    if (unlocked) card.style.cursor = 'pointer';
    card.innerHTML = `<span class="ic">${itemIcon(category, item)}</span><div><div class="name">${escapeHtml(item.name)}${equipped ? ' ' + icon('check') : ''}</div>
      <div class="desc">${unlocked ? (equipped ? 'Equipped' : 'Tap to equip') : 'Locked — open a chest'}</div></div>`;
    if (unlocked) card.addEventListener('click', () => { equip(item.id); renderAll(); });
    grid.appendChild(card);
  }
}

function renderThemesGallery() {
  renderGallery('rewards-themes-grid', 'theme', THEMES,
    (id) => Themes.equip(id),
    (id) => Store.load().settings.theme === id);
}

function renderSoundsGallery() {
  renderGallery('rewards-sounds-grid', 'soundPack', SOUND_PACKS,
    (id) => { const s = Store.load(); s.settings.soundPack = id; Store.save(); AudioEngine.correct(); },
    (id) => Store.load().settings.soundPack === id);
}

function renderCarsGallery() {
  renderGallery('rewards-cars-grid', 'car', CARS,
    (id) => { const s = Store.load(); s.settings.car = id; Store.save(); },
    (id) => Store.load().settings.car === id);
}

function renderKeysBalance() {
  const s = Store.load();
  el('rewards-keys-balance').innerHTML = `<span class="key-icon">K</span> ${s.keys}`;
  const need = Math.max(0, Cosmetics.CHEST_COST - s.keys);
  el('chest-hint').textContent = need > 0 ? `Need ${need} more key${need === 1 ? '' : 's'}.` : 'Ready to open!';
  el('open-chest-btn').disabled = s.keys < Cosmetics.CHEST_COST;
}

function renderAll() {
  renderKeysBalance();
  renderThemesGallery();
  renderSoundsGallery();
  renderCarsGallery();
  renderHeaderBadge();
}

const CATEGORY_LABEL = { theme: 'Theme', soundPack: 'Sound Pack', car: 'Car' };

export function renderRewardsScreen() {
  renderAll();
}

/* ---- Chest opening animation: appear -> shake -> burst -> reveal ---- */
function spawnChestParticles() {
  const scene = el('chest-scene');
  const n = 20;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 55;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    s.style.left = '50%';
    s.style.top = '48%';
    s.style.background = i % 2 ? 'var(--accent)' : 'var(--accent-2)';
    scene.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

async function playChestAnimation(result) {
  const overlay = el('chest-overlay');
  const svg = el('chest-svg');
  const flash = el('chest-flash');
  const prize = el('chest-prize');
  const continueBtn = el('chest-continue-btn');

  svg.classList.remove('shaking', 'burst');
  flash.classList.remove('flash');
  prize.classList.remove('revealed');
  continueBtn.style.display = 'none';
  overlay.classList.add('active');

  await wait(50);
  svg.classList.add('shaking');
  for (let i = 0; i < 5; i++) setTimeout(() => AudioEngine.countdownTick(), i * 150);
  await wait(900);

  svg.classList.remove('shaking');
  svg.classList.add('burst');
  void flash.offsetWidth;
  flash.classList.add('flash');
  spawnChestParticles();
  AudioEngine.chest();
  await wait(450);

  if (result.consolation) {
    el('chest-prize-icon').innerHTML = icon('gift');
    el('chest-prize-name').textContent = `+${result.consolation} Bonus Keys`;
    el('chest-prize-category').textContent = 'Everything unlocked!';
  } else {
    const { category, item } = result.won;
    el('chest-prize-icon').innerHTML = itemIcon(category, item);
    el('chest-prize-name').textContent = item.name;
    el('chest-prize-category').textContent = CATEGORY_LABEL[category] || '';
  }
  prize.classList.add('revealed');
  continueBtn.style.display = 'inline-flex';
  renderAll();
}

export function initRewardsUI() {
  el('rewards-back-btn').addEventListener('click', () => Router.goTo('menu'));
  el('goto-rewards-btn').addEventListener('click', () => Router.goTo('rewards'));

  el('open-chest-btn').addEventListener('click', () => {
    const result = Cosmetics.openChest();
    if (result.error) {
      showToast(icon('lock'), 'Not enough keys', result.error, { info: true, silent: true });
      return;
    }
    playChestAnimation(result);
  });

  el('chest-continue-btn').addEventListener('click', () => {
    el('chest-overlay').classList.remove('active');
  });
}
