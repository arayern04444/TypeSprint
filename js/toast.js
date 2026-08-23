/* =====================================================================
   Toasts — small top-right notification pills (achievement unlocks,
   locked-theme explanations, etc).
===================================================================== */
import { AudioEngine } from './audio.js';

export function showToast(icon, title, subtitle, opts) {
  opts = opts || {};
  if (!opts.silent) AudioEngine.achievement();
  const layer = document.getElementById('toast-layer');
  const t = document.createElement('div');
  t.className = 'toast' + (opts.info ? ' toast-info' : '');
  t.innerHTML = `<span class="ic">${icon}</span><div><div class="t1">${title}</div><div class="t2">${subtitle}</div></div>`;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 3700);
}
