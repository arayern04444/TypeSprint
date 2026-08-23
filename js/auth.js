/* =====================================================================
   Auth — guest (anonymous) sign-in, email+password sign-up/login,
   upgrading a guest session to a real account, logout, and session
   state that the rest of the app can subscribe to.

   Passwords are never seen by our own code beyond passing them
   straight into these supabase.auth.* calls — Supabase hashes and
   stores them server-side. Session persistence/restoration across
   reloads is handled entirely by the supabase-js client itself.
===================================================================== */
import { supabase } from './supabase-client.js';

const state = {
  session: null,
  profile: null,
};

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(state));
}

async function loadProfile() {
  if (!state.session) { state.profile = null; return; }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.session.user.id)
    .single();
  if (!error) state.profile = data;
}

export const Auth = {
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get session() { return state.session; },
  get profile() { return state.profile; },
  get isSignedIn() { return !!state.session; },
  get isGuest() { return !!(state.profile && state.profile.is_guest); },

  async init() {
    const { data } = await supabase.auth.getSession();
    state.session = data.session;
    if (state.session) await loadProfile();
    notify();
    supabase.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      if (session) await loadProfile();
      else state.profile = null;
      notify();
    });
  },

  async playAsGuest(nickname) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { error };
    state.session = data.session;
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', data.user.id);
    if (updErr) return { error: updErr };
    await loadProfile();
    notify();
    return { data };
  },

  async signUp(email, password, nickname) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { nickname } },
    });
    if (error) return { error };
    state.session = data.session;
    if (state.session) await loadProfile();
    notify();
    return { data };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    state.session = data.session;
    await loadProfile();
    notify();
    return { data };
  },

  // Links an email+password credential onto the CURRENT (anonymous)
  // session rather than creating a second account — auth.uid() stays
  // the same, so nothing needs migrating.
  async upgradeGuest(email, password) {
    const { data, error } = await supabase.auth.updateUser({ email, password });
    if (error) return { error };
    if (state.session) {
      await supabase.from('profiles').update({ is_guest: false }).eq('id', state.session.user.id);
      await loadProfile();
      notify();
    }
    return { data };
  },

  async signOut() {
    await supabase.auth.signOut();
    state.session = null;
    state.profile = null;
    notify();
  },
};
