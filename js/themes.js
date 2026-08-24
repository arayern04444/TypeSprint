/* =====================================================================
   Themes — CSS custom-property palettes. "Aurora" is always unlocked;
   every other theme is won from a chest (see cosmetics.js) rather than
   gated behind a specific achievement. `equip()` only applies +
   persists; callers re-render the theme picker/gallery themselves
   after a successful equip (kept here to avoid this module depending
   on UI-rendering code).
===================================================================== */
import { Store } from './store.js';

// Each theme carries its own icon + a two-stop color pair — used to
// render that theme's swatch/gallery symbol in ITS colors, not
// whatever theme happens to be currently equipped (currentColor would
// make every theme's icon look identical to whichever one is active).
export const THEMES = [
  { id: 'default', name: 'Aurora', icon: 'aurora', colors: ['#7c8cff', '#ff7ce0'] },
  { id: 'neon', name: 'Neon', icon: 'bolt', colors: ['#00f0ff', '#ff00e5'] },
  { id: 'sunset', name: 'Sunset', icon: 'sunset', colors: ['#ff8a5c', '#ff5c9a'] },
  { id: 'matrix', name: 'Matrix', icon: 'terminal', colors: ['#39ff5e', '#0a3a12'] },
  { id: 'mono', name: 'Noir', icon: 'noir', colors: ['#ffffff', '#6e6e72'] },
  { id: 'bee', name: 'Bee', icon: 'bee', colors: ['#ffd400', '#1a1a1a'] },
];

export const Themes = {
  apply(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
  },
  isUnlocked(themeId) {
    const s = Store.load();
    return s.unlockedThemes.includes(themeId);
  },
  unlock(themeId) {
    const s = Store.load();
    if (!s.unlockedThemes.includes(themeId)) { s.unlockedThemes.push(themeId); Store.save(); return true; }
    return false;
  },
  equip(themeId) {
    if (!this.isUnlocked(themeId)) return false;
    const s = Store.load();
    s.settings.theme = themeId;
    Store.save();
    this.apply(themeId);
    return true;
  },
};
