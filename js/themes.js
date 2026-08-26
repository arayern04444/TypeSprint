/* =====================================================================
   Themes — CSS custom-property palettes. "Aurora" is always unlocked;
   every other theme is won from a chest (see cosmetics.js) rather than
   gated behind a specific achievement. `equip()` only applies +
   persists; callers re-render the theme picker/gallery themselves
   after a successful equip (kept here to avoid this module depending
   on UI-rendering code).
===================================================================== */
import { Store } from './store.js';

// Each theme carries a two-stop color pair (its swatch gradient) and a
// `palette` — background, accent, accent-2, correct-key color — mirrored
// from that theme's actual CSS custom properties in index.html's
// :root[data-theme=...] blocks, so keep the two in sync if a theme's
// colors ever change. Palette dots are shown as small circles wherever
// a theme is browsed (same idea as MonkeyType's theme list showing each
// theme's real colors, not one flat swatch). No icon glyph on purpose —
// once the palette dots show the actual colors, a symbol on top of the
// swatch was just noise.
export const THEMES = [
  { id: 'default', name: 'Aurora', colors: ['#7c8cff', '#ff7ce0'], palette: ['#10121c', '#7c8cff', '#ff7ce0', '#4ee6a0'] },
  { id: 'neon', name: 'Neon', colors: ['#00f0ff', '#ff00e5'], palette: ['#05060a', '#00f0ff', '#ff00e5', '#39ff9e'] },
  { id: 'sunset', name: 'Sunset', colors: ['#ff8a5c', '#ff5c9a'], palette: ['#1a0f1f', '#ff8a5c', '#ff5c9a', '#ffd166'] },
  { id: 'matrix', name: 'Matrix', colors: ['#39ff5e', '#0a3a12'], palette: ['#000400', '#39ff5e', '#9dff9d', '#39ff5e'] },
  { id: 'mono', name: 'Noir', colors: ['#ffffff', '#6e6e72'], palette: ['#0a0a0b', '#ffffff', '#9a9a9a', '#d4d4d4'] },
  { id: 'bee', name: 'Bee', colors: ['#ffd400', '#1a1a1a'], palette: ['#14120a', '#ffd400', '#1a1a1a', '#7cfc00'] },
  { id: 'ocean', name: 'Ocean', colors: ['#2dd4da', '#1e6fa8'], palette: ['#061a22', '#2dd4da', '#1e6fa8', '#4ee6a0'] },
  { id: 'blossom', name: 'Blossom', colors: ['#ff8fb3', '#ffd1dc'], palette: ['#1f0f16', '#ff8fb3', '#ffd1dc', '#b6ff9c'] },
  { id: 'emerald', name: 'Emerald', colors: ['#22c973', '#d4af37'], palette: ['#071510', '#22c973', '#d4af37', '#22c973'] },
  { id: 'vapor', name: 'Vaporwave', colors: ['#ff6ec7', '#7c4dff'], palette: ['#150829', '#ff6ec7', '#7c4dff', '#5cffe0'] },
  { id: 'frost', name: 'Frost', colors: ['#8ec9ff', '#d8ecff'], palette: ['#0b1420', '#8ec9ff', '#d8ecff', '#7cf0c8'] },
  { id: 'coffee', name: 'Coffee', colors: ['#d9a066', '#8a5a3b'], palette: ['#1a120b', '#d9a066', '#8a5a3b', '#9fd97a'] },
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
