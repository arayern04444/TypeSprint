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
  { id: 'default', name: 'Racer', colors: ['#7c8cff', '#ff7ce0'] },
  { id: 'sedan', name: 'Sedan', colors: ['#9aa5b1', '#4d5560'] },
  { id: 'moto', name: 'Motorcycle', colors: ['#ff5a7a', '#ff9a3c'] },
  { id: 'rocket', name: 'Rocket', colors: ['#ff7c3c', '#ffd166'] },
  { id: 'bee', name: 'Bumble', colors: ['#ffd400', '#1a1a1a'] },
];

// Real little side-view vehicle illustrations (multi-color fills, not
// a single-currentColor line icon) — used on the race track and in the
// Rewards car gallery so a "car" actually reads as a car, not an
// abstract stroke glyph. viewBox is a fixed 64x28 wide plate; colors
// come from each CARS item's own `colors` pair, not the app theme.
function wheelPair(x1, x2, cy, r, rHub, rCap) {
  const wheel = (cx) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#14151c"/><circle cx="${cx}" cy="${cy}" r="${rHub}" fill="#828a9e"/><circle cx="${cx}" cy="${cy}" r="${rCap}" fill="#3a3d4a"/>`;
  return wheel(x1) + wheel(x2);
}

const CAR_SHAPES = {
  default: (c1, c2) => `
    <path d="M5 20c-1.6 0-2.6-1-2.6-2.4 0-1.5 1.1-2.6 2.8-2.6h4.3l4-7.3C15 5.6 17.6 4 20.6 4h18.6c3 0 5.7 1.7 7 4.4l3 6.6h6.4c2 0 3.4 1.4 3.4 3.1 0 1.7-1.3 2.9-3 3.1z" fill="${c1}"/>
    <path d="M52.5 9.2h5.6v3.4h-5.6z" fill="${c1}"/>
    <path d="M16.3 14.5l3.6-6.2c.9-1.6 2.6-2.5 4.4-2.5h6v8.7z" fill="${c2}" opacity=".82"/>
    <path d="M31.7 5.8h7.5c2.1 0 4 1.2 4.9 3.1l2 5.6h-14.4z" fill="${c2}" opacity=".82"/>
    <path d="M18.5 17.4h30" stroke="${c2}" stroke-width="1.3" opacity=".5"/>
    ${wheelPair(16.5, 47.5, 20.8, 5.6, 2.7, 1)}
    <circle cx="59" cy="16.6" r="1.3" fill="#fff8d6"/>
    <circle cx="3.6" cy="18" r="1" fill="#ff5a5a"/>`,
  sedan: (c1, c2) => `
    <path d="M4 20c-1.6 0-2.6-1-2.6-2.4 0-1.5 1.1-2.6 2.8-2.6h3.4l2.2-7C10.9 5.6 13.4 4 16.2 4h25.6c3.6 0 6.8 2.3 7.9 5.8l1.8 5.8h6.9c1.8 0 3.2 1.3 3.2 3 0 1.7-1.3 2.9-3 3.1z" fill="${c1}"/>
    <path d="M13.4 14.7l2.7-6c.8-1.8 2.6-3 4.6-3H30v9z" fill="${c2}" opacity=".85"/>
    <path d="M31.4 5.7h9.9c2.6 0 4.9 1.6 5.8 4l1.9 4.9H31.4z" fill="${c2}" opacity=".85"/>
    <path d="M30.2 5.7v9" stroke="${c1}" stroke-width="1.6"/>
    <path d="M16.5 17.6h32" stroke="${c2}" stroke-width="1.2" opacity=".55"/>
    ${wheelPair(15.5, 47, 20.8, 5.6, 2.7, 1)}
    <circle cx="58.5" cy="16.6" r="1.3" fill="#fff8d6"/>
    <circle cx="3" cy="18" r="1" fill="#ff5a5a"/>`,
  moto: (c1, c2) => `
    ${wheelPair(13, 49, 21, 6.4, 2.8, 1)}
    <path d="M13 21 L27 12 L38 17 L49 21" fill="none" stroke="${c1}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 17 L43 7.5" fill="none" stroke="${c1}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M39.3 7.8 L47 7" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="27" cy="14.5" rx="6.2" ry="4.2" fill="${c2}"/>
    <rect x="14" y="16.5" width="11" height="3.2" rx="1.6" fill="#20222b"/>
    <circle cx="49.3" cy="11.6" r="1.6" fill="#fff8d6"/>`,
  rocket: (c1, c2) => `
    <path d="M3 14.5l9 3.4-2.4 4.6z" fill="${c2}"/>
    <path d="M1 15l6.4 3-1.6 3.4z" fill="${c1}" opacity=".9"/>
    <path d="M9 10.5c14.5-6.4 33-6.4 43.5 3 3.2 2.9 3.2 5.9 0 8.7-10.5 9.4-29 9.4-43.5 3-3.2-1.4-4.3-4.4-4.3-7.35s1.1-5.95 4.3-7.35z" fill="${c1}"/>
    <circle cx="39" cy="17.85" r="4.7" fill="#dff3ff"/><circle cx="39" cy="17.85" r="3" fill="${c2}"/>
    <path d="M15 10.5l-4.5-6.3 10 2.3z" fill="${c2}"/>
    <path d="M15 22.5l-4.5 5.8 10-1.9z" fill="${c2}"/>
    <path d="M53 13.5c4.2 1.1 8.3 2.6 10.3 4.35-2 1.75-6.1 3.25-10.3 4.35-1.4-2.6-1.4-6.1 0-8.7z" fill="${c2}"/>`,
  bee: (c1, c2) => `
    <path d="M5 20c-1.6 0-2.6-1-2.6-2.4 0-1.5 1.1-2.6 2.8-2.6h4.3l4-7.3C15 5.6 17.6 4 20.6 4h18.6c3 0 5.7 1.7 7 4.4l3 6.6h6.4c2 0 3.4 1.4 3.4 3.1 0 1.7-1.3 2.9-3 3.1z" fill="${c1}"/>
    <path d="M13 15h5v4.6h-5zM22 15h5v4.6h-5zM31 15h5v4.6h-5zM40 15h5v4.6h-5zM49 15h5v4.6h-5z" fill="${c2}"/>
    <path d="M16.3 14.5l3.6-6.2c.9-1.6 2.6-2.5 4.4-2.5h6v8.7z" fill="${c2}" opacity=".88"/>
    <path d="M31.7 5.8h7.5c2.1 0 4 1.2 4.9 3.1l2 5.6h-14.4z" fill="${c2}" opacity=".88"/>
    ${wheelPair(16.5, 47.5, 20.8, 5.6, 2.7, 1)}
    <circle cx="59" cy="16.6" r="1.3" fill="#fff8d6"/>`,
};

export function carArt(carId, colors, opts) {
  const shapeFn = CAR_SHAPES[carId] || CAR_SHAPES.default;
  const [c1, c2] = colors || ['#7c8cff', '#ff7ce0'];
  const o = opts || {};
  const extraClass = o.className ? ' ' + o.className : '';
  return `<svg class="car-art${extraClass}" width="${o.width || '2.4rem'}" viewBox="0 0 64 28" aria-hidden="true">${shapeFn(c1, c2)}</svg>`;
}

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
