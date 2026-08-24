/* =====================================================================
   Icons — a small, cohesive line-icon set replacing emoji throughout
   the app. Each icon is a 24x24 stroke-based SVG using currentColor,
   so it inherits theme color automatically (an emoji couldn't) and
   sits inline at `1em` just like the character it replaces. No
   external icon font/library — hand-authored, zero-dependency,
   consistent with the rest of the project.
===================================================================== */

const PATHS = {
  person: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 010 6"/><path d="M19 7a7.5 7.5 0 010 10"/>',
  speakerMuted: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  chartLine: '<path d="M4 19h16"/><path d="M4 19l5-6 4 3 6-8"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3"/><path d="M12 13v4M9 20h6M10 20v-3h4v3"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9h16v4H4z"/><path d="M12 9v11"/><path d="M12 9c0-2-1.6-4-3.5-4S5.5 6.3 6 8c.2.7.9 1 1.5 1M12 9c0-2 1.6-4 3.5-4S18.5 6.3 18 8c-.2.7-.9 1-1.5 1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l2-2a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-2 2a4 4 0 005.7 5.7l1-1"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  crown: '<path d="M4 18h16l-1-9-4.5 4L12 6l-2.5 7L5 9l-1 9z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  sparkles: '<path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7 21l5-3 5 3-2-7.5"/>',
  flag: '<path d="M6 3v18"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
  trendingUp: '<path d="M4 17l6-6 4 4 6-8"/><path d="M15 6h5v5"/>',
  rocket: '<path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3 2-3-2c-1-1-2-3-2-5 0-4 2-8 5-10z"/><circle cx="12" cy="10" r="1.6"/><path d="M9 17l-2 4M15 17l2 4"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 9-13h-6l1-7z"/>',
  gem: '<path d="M6 9l3-6h6l3 6-6 12z"/><path d="M6 9h12M9 3l3 6 3-6"/>',
  flame: '<path d="M12 2c1 4-3 5-3 9a5 5 0 0010 0c0-2-1-3-2-4 0 2-1 3-2 2 1-3-1-5-3-7z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  barChart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 9h16M8 3v4M16 3v4"/>',
  refresh: '<path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z"/>',
  racer: '<path d="M3 15l1.5-4.5A2 2 0 016.4 9h11.2a2 2 0 011.9 1.5L21 15"/><path d="M3 15h18v2.5a1 1 0 01-1 1h-1.5a1 1 0 01-1-1V17h-11v.5a1 1 0 01-1 1H4a1 1 0 01-1-1V15z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
  sedan: '<path d="M4 16v-3l2-4h12l2 4v3"/><path d="M4 16h16"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/>',
  moto: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.3 17h4.2l2-6h3M12.5 11H9l-1 3"/>',
  hexStripes: '<path d="M12 3l7 4v10l-7 4-7-4V7l7-4z"/><path d="M5 9h14M5 13h14"/>',
  gamepad: '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11" r="1"/><circle cx="18.5" cy="13.5" r="1"/>',
  keyGrid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  star: '<path d="M12 3l2.5 6 6.5.5-5 4.3L17.5 20 12 16.5 6.5 20 8 13.8l-5-4.3L9.5 9z"/>',
  palette: '<path d="M12 3a9 8 0 100 16c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 005-5c0-3-3-5-9-5z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="11" r="1"/>',
};

export function icon(name, opts) {
  const d = PATHS[name] || PATHS.star;
  const size = (opts && opts.size) || '1em';
  const extraClass = (opts && opts.className) ? ' ' + opts.className : '';
  return `<svg class="icon${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
