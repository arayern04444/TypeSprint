/* =====================================================================
   Leaderboard — an opt-in, no-accounts global scoreboard. Deliberately
   NOT built on real accounts: submitting reuses the exact same guest
   identity (Auth.playAsGuest) multiplayer already has. Browsing needs
   only *a* session (even a silent, nickname-less anonymous one — see
   ensureViewerSession), so opening the Leaderboard screen never
   prompts for anything; only submitting a score does.
===================================================================== */
import { supabase } from './supabase-client.js';
import { Auth } from './auth.js';

export const Leaderboard = {
  // Called once when the Leaderboard screen opens. Every read in this
  // app requires at least a guest session (RLS has no anon-role grants
  // anywhere), so this exists purely to make *viewing* frictionless —
  // no nickname prompt, unlike actually submitting a score.
  async ensureViewerSession() {
    if (Auth.isSignedIn) return;
    await supabase.auth.signInAnonymously();
    // Auth's own onAuthStateChange listener (wired in Auth.init()) picks
    // this up and loads the auto-created profile — nothing else to do.
  },

  async submit(run) {
    if (!Auth.isSignedIn || !Auth.nickname) {
      return { error: { message: 'Pick a nickname first.' } };
    }
    const { error } = await supabase.from('leaderboard_entries').insert({
      user_id: Auth.session.user.id,
      nickname: Auth.nickname,
      wpm: run.wpm,
      accuracy: run.accuracy,
      best_combo: run.bestCombo,
      chars: run.chars,
      duration_sec: run.durationSec,
      difficulty: run.difficulty,
      race_mode: run.timedDurationSec ? 'timed' : 'passage',
      timed_duration_sec: run.timedDurationSec || null,
    });
    return { error };
  },

  async fetchTop({ raceMode, difficulty, timedDurationSec, limit }) {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_race_mode: raceMode,
      p_difficulty: difficulty,
      // Classic-mode rows always store timed_duration_sec = null (see
      // submit() below) — passing a stale duration through here even
      // when raceMode isn't 'timed' meant `timed_duration_sec = 30`
      // never matched a null column, so every Classic submission was
      // silently filtered out of every leaderboard view. Only ever
      // filter by duration when actually looking at Timed mode.
      p_timed_duration_sec: raceMode === 'timed' ? (timedDurationSec || null) : null,
      p_limit: limit || 100,
    });
    if (error) return [];
    return data || [];
  },
};
