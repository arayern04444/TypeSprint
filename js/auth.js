/* =====================================================================
   Auth — guest-only identity. One tap, a nickname, done (no email,
   no password). Session persistence/restoration across reloads is
   handled entirely by the supabase-js client itself.
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
  get nickname() { return state.profile ? state.profile.nickname : null; },

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

  // Signs in anonymously if there's no session yet; otherwise just
  // renames the existing guest profile. Either way, ends with a
  // session + a profile carrying the requested nickname.
  async playAsGuest(nickname) {
    if (!state.session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error };
      state.session = data.session;
    }
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', state.session.user.id);
    if (updErr) return { error: updErr };
    await loadProfile();
    notify();
    return { data: state.profile };
  },

  async signOut() {
    await supabase.auth.signOut();
    state.session = null;
    state.profile = null;
    notify();
  },
};
