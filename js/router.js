/* =====================================================================
   Router — generic screen switcher. Toggles `document.body.dataset
   .screen` (matched by CSS) and runs a per-screen `onEnter` hook if
   one was registered. Hooks are supplied by the composition root
   (app.js) via setHooks(), so this module has zero knowledge of what
   any individual screen actually does.
===================================================================== */
export const Router = (function () {
  let hooks = {};

  function setHooks(h) {
    hooks = h || {};
  }

  function goTo(screen) {
    document.body.dataset.screen = screen;
    if (hooks[screen]) hooks[screen]();
  }

  return { setHooks, goTo };
})();
