# UI Stability Patch — 27 Sep 2026

## Fixed routes
- Company Analytics now renders a complete analytics workspace instead of a blank route.
- Company Team now renders the team access table and its Manage / Invite interactions.
- Field Home, My Work, Submissions, Notifications, and Profile now have explicit render components so field navigation cannot resolve to undefined components.

## Visual fixes
- Project Pulse now uses the full chart width; the empty second grid column is removed.
- Dark mode uses explicit readable surface/text tokens for Command, pulse KPIs, tables, cards, modals, badges, and navigation.
- Occurrence-detail close buttons use a theme-safe surface and visible icon.
- Review queue badge and top navigation metadata are readable in dark mode.

## Verification
- `src/App.tsx`, `src/main.tsx`, and `src/data.ts` were transpilation-checked with TypeScript and produced no syntax diagnostics.
- The project is Vite-based and package installation/build was not run successfully because package retrieval is unavailable in this environment.
