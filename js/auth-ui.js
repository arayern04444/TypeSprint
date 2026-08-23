/* =====================================================================
   Auth UI — the `auth` screen (guest/signup/login tabs, upgrade-guest
   banner, logout), the `multiplayer-lobby` stub screen, and the
   header's account badge. Wires DOM events; Auth (auth.js) owns all
   actual session state.
===================================================================== */
import { Auth } from './auth.js';
import { Router } from './router.js';

let pendingMultiplayerRedirect = false;

function el(id) { return document.getElementById(id); }

function showTab(tab) {
  ['guest', 'signup', 'login'].forEach((t) => {
    el('auth-panel-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#auth-tabs .btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
}

function setError(id, message) {
  el(id).textContent = message || '';
}

function accountLabel() {
  if (!Auth.profile) return '';
  return Auth.profile.nickname + (Auth.isGuest ? ' (Guest)' : '');
}

export function renderAccountBadge() {
  const badge = el('account-badge');
  badge.textContent = Auth.isSignedIn && Auth.profile ? '👤 ' + accountLabel() : '👤 Sign In';
}

export function renderAuthScreen() {
  const signedOut = el('auth-signed-out');
  const signedIn = el('auth-signed-in');
  if (Auth.isSignedIn && Auth.profile) {
    signedOut.style.display = 'none';
    signedIn.style.display = 'block';
    el('auth-account-summary').textContent = accountLabel();
    el('auth-upgrade-card').style.display = Auth.isGuest ? 'block' : 'none';
  } else {
    signedOut.style.display = 'block';
    signedIn.style.display = 'none';
    showTab('guest');
  }
}

export function renderLobbyScreen() {
  el('lobby-account-summary').textContent = accountLabel();
}

export function goToMultiplayerEntry() {
  if (Auth.isSignedIn) {
    Router.goTo('multiplayer-lobby');
  } else {
    pendingMultiplayerRedirect = true;
    Router.goTo('auth');
  }
}

function afterAuthSuccess() {
  renderAuthScreen();
  renderAccountBadge();
  if (pendingMultiplayerRedirect) {
    pendingMultiplayerRedirect = false;
    Router.goTo('multiplayer-lobby');
  }
}

export function initAuthUI() {
  document.querySelectorAll('#auth-tabs .btn').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });

  el('guest-submit-btn').addEventListener('click', async () => {
    setError('guest-error', '');
    const nickname = el('guest-nickname').value.trim();
    if (nickname.length < 2) { setError('guest-error', 'Nickname must be at least 2 characters.'); return; }
    el('guest-submit-btn').disabled = true;
    const { error } = await Auth.playAsGuest(nickname);
    el('guest-submit-btn').disabled = false;
    if (error) { setError('guest-error', error.message); return; }
    afterAuthSuccess();
  });

  el('signup-submit-btn').addEventListener('click', async () => {
    setError('signup-error', '');
    const nickname = el('signup-nickname').value.trim();
    const email = el('signup-email').value.trim();
    const password = el('signup-password').value;
    if (nickname.length < 2) { setError('signup-error', 'Nickname must be at least 2 characters.'); return; }
    if (password.length < 6) { setError('signup-error', 'Password must be at least 6 characters.'); return; }
    el('signup-submit-btn').disabled = true;
    const { error } = await Auth.signUp(email, password, nickname);
    el('signup-submit-btn').disabled = false;
    if (error) { setError('signup-error', error.message); return; }
    afterAuthSuccess();
  });

  el('login-submit-btn').addEventListener('click', async () => {
    setError('login-error', '');
    const email = el('login-email').value.trim();
    const password = el('login-password').value;
    el('login-submit-btn').disabled = true;
    const { error } = await Auth.signIn(email, password);
    el('login-submit-btn').disabled = false;
    if (error) { setError('login-error', error.message); return; }
    afterAuthSuccess();
  });

  el('upgrade-submit-btn').addEventListener('click', async () => {
    setError('upgrade-error', '');
    const email = el('upgrade-email').value.trim();
    const password = el('upgrade-password').value;
    if (password.length < 6) { setError('upgrade-error', 'Password must be at least 6 characters.'); return; }
    el('upgrade-submit-btn').disabled = true;
    const { error } = await Auth.upgradeGuest(email, password);
    el('upgrade-submit-btn').disabled = false;
    if (error) { setError('upgrade-error', error.message); return; }
    renderAuthScreen();
    renderAccountBadge();
  });

  el('auth-continue-btn').addEventListener('click', () => Router.goTo('multiplayer-lobby'));

  el('auth-logout-btn').addEventListener('click', async () => {
    await Auth.signOut();
    renderAuthScreen();
    renderAccountBadge();
    Router.goTo('menu');
  });

  el('lobby-logout-btn').addEventListener('click', async () => {
    await Auth.signOut();
    renderAccountBadge();
    Router.goTo('menu');
  });

  el('account-badge').addEventListener('click', () => Router.goTo('auth'));
  el('auth-back-btn').addEventListener('click', () => Router.goTo('menu'));
  el('lobby-back-btn').addEventListener('click', () => Router.goTo('menu'));
  el('goto-multiplayer-btn').addEventListener('click', goToMultiplayerEntry);

  Auth.onChange(() => renderAccountBadge());
}
