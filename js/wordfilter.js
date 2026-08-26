/* =====================================================================
   Word filter — a nickname content check, client side. This is purely
   a UX courtesy (instant feedback, no round-trip) — the real boundary
   is the matching SQL trigger in sql/phase4_public_launch.sql, which
   runs no matter how a request reaches Supabase. Keep the two lists in
   sync if you edit either one.

   Matching is whole-word/whole-name equality against a normalized
   form, not substring matching — substring matching is the classic
   "Scunthorpe problem" (innocuous names get blocked for merely
   containing a bad substring). Intentionally short and curated: this
   stops casual abuse, not a determined bad actor.
===================================================================== */

const LEET_MAP = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '$': 's', '@': 'a', '!': 'i', '|': 'l' };

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard', 'dick', 'pussy', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'tranny', 'chink', 'spic', 'kike', 'wetback',
  'rape', 'rapist', 'nazi', 'hitler', 'pedo', 'pedophile',
];

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[01345$@!|]/g, (c) => LEET_MAP[c] || c)
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findBlockedWord(nickname) {
  const normalized = normalize(nickname);
  const glued = normalized.replace(/ /g, '');
  if (BLOCKED_WORDS.includes(glued)) return glued;
  return normalized.split(' ').find((tok) => BLOCKED_WORDS.includes(tok)) || null;
}

export function isNicknameAllowed(nickname) {
  return findBlockedWord(nickname) === null;
}
