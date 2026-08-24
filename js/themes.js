/* =====================================================================
   Themes — CSS custom-property palettes. "Aurora" is always unlocked;
   every other theme is won from a chest (see cosmetics.js) rather than
   gated behind a specific achievement. `equip()` only applies +
   persists; callers re-render the theme picker/gallery themselves
   after a successful equip (kept here to avoid this module depending
   on UI-rendering code).
===================================================================== */
import { Store } from './store.js';

export const THEMES = [
  { id: 'default', name: 'Aurora' },
  { id: 'neon', name: 'Neon' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'matrix', name: 'Matrix' },
  { id: 'mono', name: 'Noir' },
  { id: 'bee', name: 'Bee' },
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
