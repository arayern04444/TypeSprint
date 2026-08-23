# TypeSprint

A visual, gamified typing speed trainer, built as a small vanilla JS web app (ES modules, no build step, no framework).

## Play it now

**[typesprint-sable.vercel.app](https://typesprint-sable.vercel.app)** — no install, no account needed for solo play.

## How to play

1. Pick a difficulty on the menu (or **Auto**, which adapts to your recent accuracy/speed).
2. Hit **Start Race**, wait for the 3-2-1 countdown, then type the passage exactly as shown.
3. A mistake blocks you from moving on until you fix it — this trains accurate muscle memory instead of letting errors pile up.
4. Check your WPM, accuracy, and combo streak live, then see your full results — including any newly unlocked achievements or themes — when you finish.

## Progression

- **Stats & history**: every run is saved locally in your browser, with a WPM trend sparkline and full run history under **History**.
- **Achievements**: 12 badges to unlock, from your first race up to hitting 90 WPM, big combo streaks, and accuracy milestones — see them all under **Achievements**.
- **Themes**: unlock new color themes (Neon, Sunset, Matrix) by earning specific achievements, then equip them from the menu's theme picker.
- **Adaptive practice**: the game quietly tracks which characters and words trip you up most and weights future passages toward giving you extra practice on them.

## Data & privacy

All progress (history, achievements, themes, settings) is stored only in your browser's `localStorage`, under the key `typingGame.v1`. Nothing is sent anywhere. Progress is per-browser — it won't follow you to a different browser or computer.

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
