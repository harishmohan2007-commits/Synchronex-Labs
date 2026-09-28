# Synchronex portal flow

The UI is separated into two workspaces while keeping the existing Synchronex planning-to-execution model intact.

## Company portal

- Command — project control room
- Schedule — baseline L5/L6 executable plan
- Import — company schedule and existing project evidence intake
- Review — planner validation of ambiguous/unmatched field events
- Analytics — validated project performance and delay insight
- Memory — reusable validated execution knowledge
- Trace — append-only provenance
- Team — role and access overview
- Settings — confidence, timezone and evidence controls

## Field portal

- Field Home — receive the approved baseline and start reporting
- Capture — text, voice, and supporting file evidence in one progress report
- Submissions — status of submitted field updates
- Notifications — assignment and submission updates
- Profile — field account and project access

## Authentication

The demo login explicitly selects either Company portal or Field portal. Switching between portals requires signing in again so the two workspaces remain distinct.

## Boundary

Company users control the approved baseline and planner decisions. Field users receive the approved baseline as read-only context, perform the work, and report execution evidence through Capture. They cannot access company baseline administration, Review, Analytics, Memory, Trace, Team, Import, or Settings through the field navigation.
