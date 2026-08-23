/* =====================================================================
   Multiplayer — room create/join, live presence/roster, synchronized
   countdown, in-race progress broadcast, and result submission, all
   over one Supabase Realtime channel per room. UI-agnostic; screens
   subscribe via the on*() listener methods below.
===================================================================== */
import { supabase } from './supabase-client.js';
import { Auth } from './auth.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L — avoids ambiguous codes

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

function throttle(fn, ms) {
  let last = 0, pending = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else {
      clearTimeout(pending);
      pending = setTimeout(() => { last = Date.now(); fn(...args); }, ms - (now - last));
    }
  };
}

const state = {
  room: null,
  isHost: false,
  channel: null,
  players: new Map(), // user_id -> { nickname, ready, pos, wpm, accuracy, done }
};

const listeners = { players: new Set(), roomStatus: new Set(), progress: new Set(), results: new Set() };
function emit(kind, ...args) { listeners[kind].forEach((fn) => fn(...args)); }

function upsertPlayer(userId, patch) {
  const cur = state.players.get(userId) || { nickname: '?', ready: false, pos: 0, wpm: 0, accuracy: 100, done: false };
  state.players.set(userId, Object.assign(cur, patch));
}

function subscribeChannel(roomId) {
  const userId = Auth.session.user.id;
  const channel = supabase.channel('room:' + roomId, { config: { presence: { key: userId } } });

  channel.on('presence', { event: 'sync' }, () => {
    const presenceState = channel.presenceState();
    const seen = new Set();
    for (const key in presenceState) {
      const meta = presenceState[key][0] || {};
      seen.add(key);
      upsertPlayer(key, { nickname: meta.nickname, ready: !!meta.ready });
    }
    for (const uid of Array.from(state.players.keys())) {
      if (!seen.has(uid)) state.players.delete(uid);
    }
    emit('players');
  });

  channel.on('broadcast', { event: 'race_start' }, ({ payload }) => {
    if (state.room) state.room.race_start_at = new Date(payload.raceStartAt).toISOString();
    emit('roomStatus', { status: 'countdown', raceStartAt: payload.raceStartAt });
  });

  channel.on('broadcast', { event: 'progress' }, ({ payload }) => {
    upsertPlayer(payload.userId, { pos: payload.pos, wpm: payload.wpm, accuracy: payload.accuracy, done: payload.done });
    emit('progress', payload);
  });

  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
    const row = payload.new;
    if (state.room) { state.room.status = row.status; state.room.race_start_at = row.race_start_at; }
    emit('roomStatus', {
      status: row.status,
      raceStartAt: row.race_start_at ? new Date(row.race_start_at).getTime() : null,
    });
  });

  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'race_results', filter: `room_id=eq.${roomId}` }, (payload) => {
    emit('results', payload.new);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ nickname: Auth.nickname, ready: false });
    }
  });

  state.channel = channel;
}

export const Multiplayer = {
  get room() { return state.room; },
  get isHost() { return state.isHost; },
  get players() { return state.players; },

  onPlayersChange(fn) { listeners.players.add(fn); return () => listeners.players.delete(fn); },
  onRoomStatus(fn) { listeners.roomStatus.add(fn); return () => listeners.roomStatus.delete(fn); },
  onProgress(fn) { listeners.progress.add(fn); return () => listeners.progress.delete(fn); },
  onResults(fn) { listeners.results.add(fn); return () => listeners.results.delete(fn); },

  async createRoom(passageObj) {
    const userId = Auth.session.user.id;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await supabase.from('rooms').insert({
        code, host_id: userId, passage_text: passageObj.text, passage_difficulty: passageObj.difficulty,
      }).select().single();
      if (!error) {
        state.room = data;
        state.isHost = true;
        state.players.clear();
        await supabase.from('room_players').insert({ room_id: data.id, user_id: userId, nickname: Auth.nickname });
        subscribeChannel(data.id);
        return { data };
      }
      if (error.code !== '23505') return { error }; // not a code collision — bail
    }
    return { error: { message: 'Could not generate a unique room code — try again.' } };
  },

  async joinRoom(codeRaw) {
    const code = (codeRaw || '').trim().toUpperCase();
    if (code.length !== 6) return { error: { message: 'Room codes are 6 characters.' } };
    const { data, error } = await supabase.rpc('find_room_by_code', { p_code: code });
    if (error) return { error };
    if (!data || data.length === 0) return { error: { message: "Room not found — check the code, or it may have already started." } };
    const roomMeta = data[0];
    const userId = Auth.session.user.id;
    const { error: joinErr } = await supabase
      .from('room_players')
      .insert({ room_id: roomMeta.id, user_id: userId, nickname: Auth.nickname });
    if (joinErr) return { error: joinErr };
    const { data: roomRow, error: roomErr } = await supabase.from('rooms').select('*').eq('id', roomMeta.id).single();
    if (roomErr) return { error: roomErr };
    state.room = roomRow;
    state.isHost = false;
    state.players.clear();
    subscribeChannel(roomRow.id);
    return { data: roomRow };
  },

  async leaveRoom() {
    if (state.channel) { await state.channel.unsubscribe(); state.channel = null; }
    if (state.room) {
      const userId = Auth.session.user.id;
      await supabase.from('room_players').delete().eq('room_id', state.room.id).eq('user_id', userId);
    }
    state.room = null;
    state.isHost = false;
    state.players.clear();
  },

  async setReady(ready) {
    if (!state.channel || !state.room) return;
    const userId = Auth.session.user.id;
    await supabase.from('room_players').update({ is_ready: ready }).eq('room_id', state.room.id).eq('user_id', userId);
    await state.channel.track({ nickname: Auth.nickname, ready });
  },

  async startRace() {
    if (!state.isHost || !state.room) return;
    const raceStartAt = Date.now() + 5000;
    await supabase.from('rooms')
      .update({ status: 'countdown', race_start_at: new Date(raceStartAt).toISOString() })
      .eq('id', state.room.id);
    state.channel.send({ type: 'broadcast', event: 'race_start', payload: { raceStartAt } });
  },

  sendProgress: throttle((patch) => {
    if (!state.channel || !state.room) return;
    const userId = Auth.session.user.id;
    state.channel.send({ type: 'broadcast', event: 'progress', payload: Object.assign({ userId }, patch) });
  }, 250),

  async submitResult(run) {
    if (!state.room) return { error: { message: 'Not in a room.' } };
    const userId = Auth.session.user.id;
    const { error } = await supabase.from('race_results').insert({
      room_id: state.room.id, user_id: userId, nickname: Auth.nickname,
      wpm: run.wpm, accuracy: run.accuracy, best_combo: run.bestCombo,
      duration_sec: run.durationSec, chars: run.chars,
    });
    return { error };
  },

  async fetchResults() {
    if (!state.room) return [];
    const { data } = await supabase
      .from('race_results').select('*').eq('room_id', state.room.id).order('wpm', { ascending: false });
    return data || [];
  },
};
