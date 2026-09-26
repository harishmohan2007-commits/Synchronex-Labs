# Synchronex — SIH26122 Prototype UI

A React + Vite prototype for the Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- No environment variables are required for the demo UI.

## Prototype flow

Sign in → Command → Capture/Import → Extract → Confidence gate → Review → Apply → Trace → Memory.

The current UI uses synthetic data. Supabase/API/LLM integration can be added without changing the information architecture.

## Current UX implementation notes
- Command is the project-level control room; discipline/workstream execution belongs on Schedule only.
- Schedule opens with separate discipline cards. Selecting a card filters the schedule to that discipline; “All disciplines” returns to the overview.
- The global search supports activity IDs, titles, disciplines/WBS context, field evidence and review items, with typo-tolerant ranking and keyboard navigation (`Ctrl/Cmd + K`, arrows, Enter, Escape).
- Review candidates resolve to their actual activity title rather than a hard-coded label, and approved review items leave the active queue for the current session.
- Import success exposes a working path into Review.
