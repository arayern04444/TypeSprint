/* =====================================================================
   Themes — CSS custom-property palettes, gated behind achievements.
   `equip()` only applies + persists; callers re-render the theme
   picker/gallery themselves after a successful equip (kept here to
   avoid this module depending on UI-rendering code).
===================================================================== */
import { Store } from './store.js';

export const THEMES = [
  { id: 'default', name: 'Aurora', unlockedBy: null },
  { id: 'neon', name: 'Neon', unlockedBy: 'wpm60' },
  { id: 'sunset', name: 'Sunset', unlockedBy: 'combo50' },
  { id: 'matrix', name: 'Matrix', unlockedBy: 'hard_tier_clear' },
  { id: 'mono', name: 'Noir', unlockedBy: 'ten_races' },
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
