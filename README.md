# TypeSprint

A visual, gamified typing speed trainer, built as a small vanilla JS web app (ES modules, no build step, no framework).

## Play it now

**[typesprint-sable.vercel.app](https://typesprint-sable.vercel.app)** — no install, no account needed for solo play.

## How to play

1. Pick a difficulty and passage length on the menu (or **Auto** difficulty, which adapts to your recent accuracy/speed).
2. Hit **Start Race**, wait for the 3-2-1 countdown, then type the passage exactly as shown.
3. A wrong letter is marked and costs you accuracy and your combo streak, but the race keeps moving — no need to retype it.
4. Check your WPM, accuracy, and combo streak live, then see your full results — including any newly unlocked achievements or themes — when you finish. Longer passages and harder difficulties earn more Keys (see Progression below).

## Multiplayer

Race friends live, no accounts needed: pick a nickname, then **Create** a room (you get a 6-character code to share) or **Join** one with a code someone sent you. Everyone in the lobby sees each other in real time; once the host starts, a synchronized countdown leads into a visual car-race track where each player's car moves live as they type. Finish to see a ranked leaderboard, then hit **Play Again** to rematch the same room.

## Progression

- **Stats & history**: every run is saved locally in your browser, with a WPM trend sparkline and full run history under **History**.
- **Achievements**: 12 badges to unlock, from your first race up to hitting 90 WPM, big combo streaks, and accuracy milestones — see them all under **Achievements**.
- **Keys & Rewards**: racing and achievements earn Keys — more for longer passages and harder difficulties. Spend Keys on chests under **Rewards** for a random cosmetic: one of 6 themes, 7 sound packs, or 5 car skins.
- **Adaptive practice**: the game quietly tracks which characters and words trip you up most and weights future passages toward giving you extra practice on them.

## Data & privacy

Solo play never leaves your browser: all progress (history, achievements, unlocked cosmetics, settings) is stored only in `localStorage`, under the key `typingGame.v1`. It's per-browser — it won't follow you to a different browser or computer.

Multiplayer is different: to race with others, your chosen nickname, the room's passage, and your race results are sent to and stored in a small Supabase backend (guest accounts only — no email or password) so other players in your room can see them. See [sql/](sql/) for the exact database schema and access rules.

To wipe your progress and start fresh, use the **Reset Progress** button on the menu (you'll be asked to confirm first).

## Local development

The app is split into ES modules under `js/`, loaded via `<script type="module">`. Modern browsers won't reliably load modules from a `file://` double-click, so serve the folder over `http://` instead. If you have Python or Node installed:

```bash
python -m http.server 8000
# or
npx serve .
```

If neither is available, this repo includes a zero-dependency PowerShell static server:

```powershell
powershell -ExecutionPolicy Bypass -File .\_devserver.ps1 -Port 8123
```

Then open `http://localhost:8000` (or whichever port you used).
