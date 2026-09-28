# Synchronex consolidated update

This build is based on the user-provided Synchronex-Labs-Command-Schedule-Import-Updated(1).zip and folds in the previously requested UI/flow changes:

- Company Portal / Field Portal separation retained.
- Company login opens Command; Field login opens Field Home.
- Command Project Pulse uses full main width, includes a visible Y-axis, and removes Control Focus.
- Schedule discipline overview keeps the cards consistent and the focused discipline view is a clean full-width activity view with a Back link.
- Activity detail keeps the Synchronex modal treatment and uses theme-aware surfaces.
- Import is a two-card company intake flow: Schedule Import + Evidence Import, with any-file support and no leaked native file controls or old validation-pipeline/inputs block.
- Review queue opens a separate Resolve-before-apply detail state on row click with Back; validation surfaces are theme-aware.
- Memory activity type -> occurrence list -> floating occurrence detail, including uploaded on / uploaded by/source information and Back.
- Team Manage and Invite actions remain functional through modal windows.
- Settings retains Light/Dark/System plus density, notifications, threshold and regional controls; detached legacy trust panel is hidden.
- Dark/System theme uses readable shared theme variables across dashboards, tables, cards, import surfaces, review panels and modals.
- Field Capture supports text, any-file evidence and voice recording.

Validation performed in this environment:
- TypeScript/TSX transpilation check: PASS for active source files.
- Full npm dependency installation/build: not completed because the environment has no cached npm packages and registry access is unavailable here.
