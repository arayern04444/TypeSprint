/* =====================================================================
   Rewards UI — the `rewards` screen: keys balance, chest opening +
   reveal, and the three equippable cosmetic galleries (themes, sound
   packs, cars).
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';
import { Cosmetics, SOUND_PACKS, CARS } from './cosmetics.js';
import { AudioEngine } from './audio.js';
import { showToast } from './toast.js';
import { Router } from './router.js';
import { renderHeaderBadge } from './screens.js';

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    card.innerHTML = `<span class="ic">${item.emoji || '🎨'}</span><div><div class="name">${escapeHtml(item.name)}${equipped ? ' ✓' : ''}</div>
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
  el('chest-reveal').innerHTML = '';
}

export function initRewardsUI() {
  el('rewards-back-btn').addEventListener('click', () => Router.goTo('menu'));
  el('goto-rewards-btn').addEventListener('click', () => Router.goTo('rewards'));

  el('open-chest-btn').addEventListener('click', () => {
    const result = Cosmetics.openChest();
    if (result.error) {
      showToast('🔒', 'Not enough keys', result.error, { info: true, silent: true });
      return;
    }
    AudioEngine.chest();
    if (result.consolation) {
      showToast('🎁', 'Chest opened!', `Everything's already unlocked — here's ${result.consolation} bonus keys!`, { silent: true });
    } else {
      const { category, item } = result.won;
      showToast(item.emoji || '🎨', (CATEGORY_LABEL[category] || 'Item') + ' unlocked!', item.name, { silent: true });
    }
    renderAll();
  });
}
