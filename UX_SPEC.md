# Synchronex — Implemented UI/UX & Logic Specification

## 1. Information architecture

Authentication
- Sign in
- Password recovery

Project workspace
- 01 Command — baseline-to-actual operational control
- 02 Schedule — L5/L6 activity lattice and selected-node inspector
- 03 Capture — free-text field intelligence and extraction pipeline
- 04 Review — human validation / confidence gate
- 05 Memory — validated historical execution knowledge
- 06 Trace — provenance ledger
- 07 Import — controlled heterogeneous data intake
- 08 Settings — trust and automation controls

## 2. End-to-end journey

Sign in → active project context → Command → Capture or Import → extraction → activity search → confidence gate → auto-linkable OR planner review → apply → trace → memory.

Decision rules:
- Empty input: block submission and explain what is required.
- Invalid email: inline validation.
- Missing password: inline validation.
- Processing: disable duplicate submission and expose deterministic stages.
- High-confidence valid match: eligible for automatic application according to workspace threshold.
- Ambiguous / low-confidence / granularity mismatch: planner review.
- No baseline match: explicit new-activity proposal; never silently discard.
- Validation failure: preserve source and provide retry.
- Unsaved capture draft: navigation opens confirmation; stay or discard.
- Accepted change: create trace event and expose consequence.

## 3. Type scale

- Display: 54 px auth hero / 32 px page title / 24 px section heading
- Card or feature heading: 18–22 px
- Primary body: 16 px minimum
- Secondary body: 14 px
- Helper: 13 px
- Metadata / labels: 10–12 px IBM Plex Mono, uppercase, tracked
- Metrics: 31 px IBM Plex Mono

Typography uses weight, contrast, spacing, and mono metadata rather than oversized decorative text.

## 4. Visual system

- Canvas: #FBFAF6 / #F4F3EE
- Ink: #18252B
- Navigation: #202C31 / #172126
- Structural green: #17463B
- Supporting blue: #1C4F8A
- Error: #B7352C
- Review amber: #A45B13
- Borders: #D7DDD9
- Focus: #2467B1

The layout avoids glassmorphism, excessive rounded cards, and generic SaaS dashboard grids. Information is grouped by workflow and decision responsibility.

## 5. Component interaction states

Primary action: dark green filled.
Secondary: white structural outline.
Destructive: white with red border/text.
Selected navigation/table row: pale green surface + 3 px left rule.
Hover: subtle surface change, no motion-dependent meaning.
Focus: visible 3 px high-contrast blue outline.
Disabled: reduced contrast + pointer disabled.
Loading: action label changes and processing stages advance.
Success: green confirmation chip / semantic status.
Error: red inline message with retry.

## 6. Accessibility

- Primary body content is 16 px minimum.
- Semantic buttons are used for actions.
- Active navigation uses aria-current.
- Icon-only buttons use aria-label.
- Modal uses dialog semantics and aria-modal.
- Status/toast uses role=status; validation errors use role=alert.
- Keyboard can activate schedule rows and import dropzone.
- Focus state is visible and not color-only.
- Tables retain explicit column headings.

## 7. Screen wireframes

### Command
Status strip → metric band → project pulse (trajectory + discipline signals) → recent execution signals. Right rail shows decision workload, next control, and project health.

### Schedule
Toolbar → activity table → selected-node inspector. Inspector exposes progress, plan/actual dates, latest evidence, and AI confidence.

### Capture
Field statement input → extraction action → six-stage process rail → extracted event cards → confidence/status. Import is an explicit alternative.

### Review
Event evidence → confidence ring → candidate cards → confirm/apply, choose another, or flag new activity → validation checks.

### Memory
Validated historical activity table → delay pattern/productivity/knowledge cards.

### Trace
Provenance introduction → append-only ledger with time, actor, action, object, source, change, confidence.

### Import
Keyboard-accessible dropzone → validation/process action → processing pipeline → success summary. Source preservation and retry are explicit.

### Settings
Automation threshold → timezone → evidence retention → save confirmation. Safe-default panel explains that ambiguity remains human-gated.

## 8. Prototype boundary

The UI intentionally demonstrates the SIH26122 planning-to-execution bridge using synthetic data. Production OCR, ASR, enterprise schedule APIs, and live project data are not required for the prototype.

## Command page discipline panel interaction — v3.0
The Command right rail is the primary quick-scan surface for workstream health. Discipline sectors are independent controls rather than rows in a shared table. Users can expand a sector to inspect actual, planned, variance, and next milestone details, then move directly to the schedule. Civil is expanded by default; other sectors remain collapsed to preserve screen real estate.
