/* =====================================================================
   Cosmetics — chest currency spend, and the three unlockable
   categories (themes, sound packs, car skins). Themes delegate to the
   existing Themes module (single source of truth for unlockedThemes);
   sound packs and cars are tracked directly on Store.
===================================================================== */
import { Store } from './store.js';
import { Themes, THEMES } from './themes.js';

const CHEST_COST = 100;
const CONSOLATION_KEYS = 20;

export const SOUND_PACKS = [
  { id: 'default', name: 'Default', emoji: '🔊' },
  { id: 'arcade', name: 'Arcade', emoji: '🕹️' },
  { id: 'mechanical', name: 'Mechanical', emoji: '⌨️' },
];

export const CARS = [
  { id: 'default', name: 'Racer', emoji: '🏎️' },
  { id: 'sedan', name: 'Sedan', emoji: '🚗' },
  { id: 'moto', name: 'Motorcycle', emoji: '🏍️' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀' },
  { id: 'bee', name: 'Bumble', emoji: '🐝' },
];

const CATEGORIES = {
  theme: { list: THEMES, storeKey: 'unlockedThemes' },
  soundPack: { list: SOUND_PACKS, storeKey: 'unlockedSoundPacks' },
  car: { list: CARS, storeKey: 'unlockedCars' },
};

export const Cosmetics = {
  CHEST_COST,

  isUnlocked(category, id) {
    if (id === 'default') return true;
    if (category === 'theme') return Themes.isUnlocked(id);
    const s = Store.load();
    return s[CATEGORIES[category].storeKey].includes(id);
  },

  unlock(category, id) {
    if (category === 'theme') return Themes.unlock(id);
    const s = Store.load();
    const key = CATEGORIES[category].storeKey;
    if (!s[key].includes(id)) { s[key].push(id); Store.save(); return true; }
    return false;
  },

  lockedItems(category) {
    return CATEGORIES[category].list.filter((item) => !this.isUnlocked(category, item.id));
  },

  allLocked() {
    return Object.keys(CATEGORIES).flatMap((category) =>
      this.lockedItems(category).map((item) => ({ category, item })));
  },

  openChest() {
    const s = Store.load();
    if (s.keys < CHEST_COST) return { error: `Not enough keys — need ${CHEST_COST - s.keys} more.` };
    const pool = this.allLocked();
    s.keys -= CHEST_COST;
    s.stats.chestsOpened += 1;
    if (pool.length === 0) {
      Store.addKeys(CONSOLATION_KEYS);
      Store.save();
      return { consolation: CONSOLATION_KEYS };
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    this.unlock(picked.category, picked.item.id);
    Store.save();
    return { won: picked };
  },
};
