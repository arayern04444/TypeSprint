/* =====================================================================
   Auth — guest-only identity. One tap, a nickname, done (no email,
   no password). Session persistence/restoration across reloads is
   handled entirely by the supabase-js client itself.
===================================================================== */
import { supabase } from './supabase-client.js';
import { isNicknameAllowed } from './wordfilter.js';

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
  // Two round-trips shaved off the common case, both aimed at the
  // "joining a room feels slow" complaint: skip the network entirely
  // if we already have this exact nickname, and when we do need to
  // write it, ask Postgres to hand the updated row straight back
  // instead of writing then doing a separate follow-up read.
  async playAsGuest(nickname) {
    if (state.session && state.profile && state.profile.nickname === nickname) {
      return { data: state.profile };
    }
    // Instant client-side check before touching the network — the SQL
    // trigger in sql/phase4_public_launch.sql is the real boundary
    // (this alone can't be trusted; anyone can call the API directly),
    // but rejecting obvious cases here avoids a round-trip just to get
    // a raw database error back.
    if (!isNicknameAllowed(nickname)) {
      return { error: { message: "That nickname isn't allowed — please pick another." } };
    }
    if (!state.session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error };
      state.session = data.session;
    }
    const { data, error: updErr } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', state.session.user.id)
      .select()
      .single();
    if (updErr) return { error: updErr };
    state.profile = data;
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
