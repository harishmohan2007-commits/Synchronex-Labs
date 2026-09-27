# Final UI Readability Fixes — 27 Sep 2026

- Removed the Import validation-pipeline section and all content below it.
- Import now ends after the intake cards, with only a compact status banner shown after a file is selected/processed.
- Added a pre-React theme bootstrap so Dark/System applies before the first render.
- Added a final high-contrast dark palette and surface/text overrides so major cards, tables, headings, controls, and status content remain readable.
- Schedule overview contains no discipline instruction block in the active src/App.tsx implementation.

Active entrypoint: `index.html` → `src/main.tsx` → `src/App.tsx`.
