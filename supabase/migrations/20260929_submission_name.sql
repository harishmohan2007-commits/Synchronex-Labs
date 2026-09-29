-- Store the field worker's chosen submission name separately from the raw evidence.
-- This keeps list views concise while preserving the complete field event for review.
alter table public.execution_events
  add column if not exists submission_name text;
