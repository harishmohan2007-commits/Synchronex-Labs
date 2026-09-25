# UI / UX Update — Dashboard + Global Search

Updated from the supplied Synchronex UX redesign ZIP.

## Changed files
- `src/App.tsx`
  - Added a functional global workspace search opened from the header search control or `Ctrl/Cmd + K`.
  - Search covers activities/WBS nodes, field execution signals/reports, and review-queue items.
  - Added keyboard navigation (Arrow Up/Down, Enter, Escape) and clickable results.
  - Search results route to the relevant screen and select the relevant activity when available.
  - Review-required dashboard signals now route directly to the planner review flow instead of opening an invalid schedule node.
- `src/index.css`
  - Added the search palette, result states, keyboard-hint styling, hover/focus behavior, and dashboard interaction refinements.

## Intended flow
`Dashboard → Search → Result → Relevant screen → Action`

The search bar is now a real project-navigation control rather than a visual placeholder.

## Validation
The TSX source was syntax/transpile checked with the installed TypeScript compiler. A full Vite production build could not be run in this environment because the ZIP does not contain installed dependencies and package installation is unavailable here.
