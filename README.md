# TypeSprint

A visual, gamified typing speed trainer — a single self-contained web page, no install required.

## How to play

Just double-click **`index.html`** to open it in your browser (Chrome, Edge, or Firefox all work). It runs entirely offline — no server, no internet connection, no account.

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
