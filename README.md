# Jarvis Personal Dashboard (PWA)

A React + Tailwind + Three.js progressive web app starter for your personal all-in-one tracking dashboard.

## Included

- PWA setup (`vite-plugin-pwa`) with manifest and installable behavior
- Jarvis-style dashboard theme with animated Three.js background
- Widget-first dashboard with starter trackers:
  - Poker winnings/losses
  - Mileage hiked
  - Workouts + PRs
  - Shoe collection
  - Calories + food log
  - Be Awesome Productions business view
- Per-widget drill-down screens with filters
- Add/remove widget support with localStorage persistence

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Extend Next

- Replace sample data in `src/data/trackerData.js` with your real entries
- Add custom field schemas per widget and data entry forms
- Add chart components (e.g. `recharts`) for trend visuals
- Add auth/sync later if you want cloud backup
