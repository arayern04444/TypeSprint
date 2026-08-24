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

// Each item carries an icon name + its own two-stop color pair (read by
// rewards-ui's badge renderer) so every cosmetic gets a distinct,
// colorful "chip" instead of a flat line-icon in the app's currentColor.
export const SOUND_PACKS = [
  { id: 'default', name: 'Classic', icon: 'speaker', colors: ['#7c8cff', '#ff7ce0'] },
  { id: 'arcade', name: 'Arcade', icon: 'gamepad', colors: ['#ffcc00', '#ff5e5e'] },
  { id: 'mechanical', name: 'Mechanical', icon: 'keyGrid', colors: ['#9aa5b1', '#4d5560'] },
  { id: 'synth', name: 'Synthwave', icon: 'waveform', colors: ['#ff6ec7', '#7b5bff'] },
  { id: 'chiptune', name: '8-Bit', icon: 'invader', colors: ['#39ff5e', '#00c2ff'] },
  { id: 'laser', name: 'Sci-Fi', icon: 'laserBeam', colors: ['#ff2d55', '#ff8a00'] },
  { id: 'zen', name: 'Lo-Fi', icon: 'moonWave', colors: ['#8fd3ff', '#c9a7ff'] },
];

export const CARS = [
  { id: 'default', name: 'Racer', icon: 'racer', colors: ['#7c8cff', '#ff7ce0'] },
  { id: 'sedan', name: 'Sedan', icon: 'sedan', colors: ['#9aa5b1', '#4d5560'] },
  { id: 'moto', name: 'Motorcycle', icon: 'moto', colors: ['#ff5a7a', '#ff9a3c'] },
  { id: 'rocket', name: 'Rocket', icon: 'rocket', colors: ['#ff7c3c', '#ffd166'] },
  { id: 'bee', name: 'Bumble', icon: 'hexStripes', colors: ['#ffd400', '#1a1a1a'] },
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
