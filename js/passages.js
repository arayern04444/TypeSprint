/* =====================================================================
   Passage bank + adaptive difficulty selection.
===================================================================== */
import { Store } from './store.js';

const AUTO_TIERS = ['easy', 'medium', 'hard'];
const AUTO_WPM_TARGET = { easy: 20, medium: 40, hard: Infinity };

// A "length" just controls how many bank sentences get stitched
// together into one passage — no separate content to author per
// length. Keys reward more for a longer passage, but that's driven by
// the actual character count at the end (see store.js), not this id
// directly, so it stays correct even in multiplayer where every racer
// types the same server-chosen passage regardless of who picked it.
export const LENGTHS = [
  { id: 'short', name: 'Short', sentences: 1 },
  { id: 'medium', name: 'Medium', sentences: 2 },
  { id: 'long', name: 'Long', sentences: 3 },
];

// Timed mode races the clock instead of a fixed passage. Rather than
// truly streaming endless text, we generate a passage deliberately
// long enough that essentially nobody reaches the end before time's
// up (see pickTimedPassage) — Race then ends the race on the clock
// (see race.js), not on reaching the end of the text.
export const TIMED_DURATIONS = [15, 30, 60, 120];

export const PASSAGE_BANK = {
  easy: [
    "the quick brown fox jumps over the lazy dog",
    "she sells seashells by the seashore every summer",
    "a good typist keeps their eyes on the screen",
    "practice a little every day and you will improve",
    "the cat sat on the warm mat in the sun",
    "we walked to the store to buy some fresh bread",
    "small steps every day add up to big results",
    "the rain fell softly on the quiet green hills",
    "he likes to read a new book every single week",
    "keep your hands relaxed and your shoulders loose",
    "the children played happily in the open field",
    "a calm mind helps you type with fewer mistakes",
    "the sun rises early on a bright summer morning",
    "good habits are built one small choice at a time",
  ],
  medium: [
    "Typing quickly isn't about rushing, it's about rhythm and accuracy working together.",
    "She whispered, \"Don't forget your umbrella, it's going to rain later!\"",
    "Learning to type well takes practice, patience, and a little bit of daily effort.",
    "The museum's new exhibit features art, sculpture, and photography from the 1990s.",
    "\"Where did you put my keys?\" he asked, searching through the cluttered drawer.",
    "Consistency beats intensity: ten focused minutes a day outperforms one long session.",
    "The recipe calls for 2 cups of flour, 1 teaspoon of salt, and 3 eggs.",
    "By the end of the meeting, everyone agreed on the plan for next quarter.",
    "It's easy to underestimate how much progress compounds over several months.",
    "The train departs at 7:45 AM, so we should leave the house by 7:00.",
    "Reading aloud, even for five minutes, can improve both memory and focus.",
    "\"Practice,\" she said, \"is the bridge between confusion and confidence.\"",
  ],
  hard: [
    "According to the report, revenue grew by 12.4% in Q3 2025 — exceeding forecasts by $1.2M.",
    "The API returned a 404 error; check the endpoint URL and try again (e.g., /v2/users?id=91).",
    "\"Wait — did you say $250, or 2:50 PM?\" she asked, glancing at her watch nervously.",
    "The password must contain at least 8 characters, 1 number, and 1 symbol (e.g., #, @, or %).",
    "Section 4.2(a) states: contributions exceeding $19,500/yr require additional documentation.",
    "The thermostat read -3°C at 6:15 AM, colder than the -1°C forecasted overnight.",
    "Item #4471-B was backordered; the invoice total dropped from $89.99 to $76.50 accordingly.",
    "\"That's 50% off,\" the cashier said, \"but only if you check out before 9:00 PM tonight.\"",
    "The coordinates (41.40338, 2.17403) mark the exact location of the old cathedral.",
    "Please CC: finance@company.com and reference PO#3391 in the subject line by 5 PM Friday.",
  ],
  code: [
    "function add(a, b) { return a + b; }",
    "const users = data.filter(u => u.active && u.age >= 18);",
    "for (let i = 0; i < arr.length; i++) { total += arr[i]; }",
    "if (response.ok) { return response.json(); } else { throw new Error('failed'); }",
    "class Point { constructor(x, y) { this.x = x; this.y = y; } }",
    "const obj = { name: 'Ada', roles: ['admin', 'editor'], active: true };",
    "let result = items.map(x => x * 2).reduce((a, b) => a + b, 0);",
    "try { doWork(); } catch (err) { console.error(err.message); } finally { cleanup(); }",
    "export default function App() { return <div>Hello, world!</div>; }",
    "SELECT id, name FROM users WHERE active = 1 ORDER BY created_at DESC;",
  ],
  quotes: [
    "Skill is nothing more than practiced instinct — repeated until it feels like nothing at all.",
    "The fastest way to learn a keyboard is to stop looking for the keys and start trusting your hands.",
    "Every expert was once a beginner who refused to give up after the first hundred mistakes.",
    "Speed without accuracy is just noise; accuracy without speed is just patience wearing thin.",
    "Small, consistent effort quietly outperforms occasional bursts of motivation over time.",
    "A calm typist is a fast typist — tension in the fingers always shows up in the mistakes.",
    "Progress rarely feels dramatic day to day, but it is unmistakable when you look back a month later.",
    "The keyboard does not care how you feel about it; it only responds to what your fingers actually do.",
  ],
};

export function wordsWithIndex(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  return out;
}

function weaknessScore(text, s) {
  let score = 0;
  for (const ch of text) {
    const w = s.weakChars[ch.toLowerCase()];
    if (w && w.seen >= 5) score += (w.missed / w.seen);
  }
  for (const { word } of wordsWithIndex(text)) {
    const w = s.weakWords[word];
    if (w && w.seen >= 3 && (w.missed / w.seen) > 0.4) score += 1.5;
  }
  return score;
}

// Weighted-random pick from `candidates` — favors sentences containing
// characters/words the player is weak on, same heuristic as before,
// just pulled out so pickPassage can call it once per sentence needed.
function pickWeighted(candidates, s) {
  const scored = candidates.map((text) => ({ text, score: weaknessScore(text, s) }))
    .sort((a, b) => b.score - a.score);
  if (Math.random() < 0.6 && scored[0].score > 0) {
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].text;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function pickPassage(tier, length) {
  const s = Store.load();
  let resolvedTier = tier;
  if (tier === 'auto') resolvedTier = s.settings.autoTier || 'easy';
  const list = PASSAGE_BANK[resolvedTier] || PASSAGE_BANK.easy;
  const lengthMeta = LENGTHS.find((l) => l.id === length) || LENGTHS[0];
  const count = Math.min(lengthMeta.sentences, list.length);
  const remaining = list.slice();
  const parts = [];
  for (let i = 0; i < count; i++) {
    const pick = pickWeighted(remaining, s);
    parts.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return { text: parts.join(' '), difficulty: resolvedTier, length: lengthMeta.id };
}

// Deliberately generous — assumes an unrealistic ~180 WPM sustained
// (15 chars/sec) so virtually nobody reaches the end of the generated
// passage before the timer does.
const TIMED_CHARS_PER_SEC_CEILING = 15;

export function pickTimedPassage(tier, durationSec) {
  const s = Store.load();
  let resolvedTier = tier;
  if (tier === 'auto') resolvedTier = s.settings.autoTier || 'easy';
  const list = PASSAGE_BANK[resolvedTier] || PASSAGE_BANK.easy;
  const targetChars = durationSec * TIMED_CHARS_PER_SEC_CEILING;
  let remaining = list.slice();
  const parts = [];
  let total = 0;
  while (total < targetChars) {
    if (remaining.length === 0) remaining = list.slice(); // bank exhausted — repeats are fine for a timed test
    const pick = pickWeighted(remaining, s);
    parts.push(pick);
    total += pick.length + 1;
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return { text: parts.join(' '), difficulty: resolvedTier, timedDurationSec: durationSec };
}

export function adjustAutoTier(run) {
  const s = Store.load();
  if (s.settings.difficulty !== 'auto') return;
  let idx = AUTO_TIERS.indexOf(s.settings.autoTier || 'easy');
  if (run.accuracy < 90 && idx > 0) idx -= 1;
  else if (run.accuracy >= 97 && run.wpm >= AUTO_WPM_TARGET[AUTO_TIERS[idx]] && idx < AUTO_TIERS.length - 1) idx += 1;
  s.settings.autoTier = AUTO_TIERS[idx];
}
