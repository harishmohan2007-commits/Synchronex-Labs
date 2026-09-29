-- Synchronex schedule-ingestion schema. Execution/review/trace tables already exist
-- in the live project and must NOT be recreated with a second incompatible schema.
-- Schedule layer only:
alter table public.projects add column if not exists manager text;
alter table public.projects add column if not exists source_format text;
alter table public.projects add column if not exists source_file_name text;
alter table public.projects add column if not exists source_imported_at timestamptz;
alter table public.activities add column if not exists source_uid integer;
alter table public.activities add column if not exists outline_number text;
alter table public.activities add column if not exists outline_level integer;
alter table public.activities add column if not exists duration_hours numeric;
alter table public.activities add column if not exists is_summary boolean not null default false;
alter table public.activities add column if not exists is_milestone boolean not null default false;
alter table public.activities add column if not exists calendar_uid integer;
alter table public.wbs_nodes add column if not exists source_uid integer;
alter table public.wbs_nodes add column if not exists outline_number text;

create table if not exists public.schedule_calendars (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, uid integer not null, name text not null, created_at timestamptz not null default now(), unique(project_id,uid));
create table if not exists public.schedule_resources (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, uid integer not null, name text not null, resource_type integer, calendar_uid integer, created_at timestamptz not null default now(), unique(project_id,uid));
create table if not exists public.schedule_dependencies (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, predecessor_activity_id uuid not null references public.activities(id) on delete cascade, successor_activity_id uuid not null references public.activities(id) on delete cascade, dependency_type integer not null default 1, lag_minutes integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.schedule_assignments (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, activity_id uuid not null references public.activities(id) on delete cascade, resource_id uuid references public.schedule_resources(id) on delete set null, source_assignment_uid integer, source_resource_uid integer, units numeric, created_at timestamptz not null default now());
create table if not exists public.schedule_imports (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, source_format text not null, source_file_name text not null, imported_at timestamptz not null default now(), status text not null default 'completed' check(status in ('started','completed','failed')), task_count integer not null default 0, summary_task_count integer not null default 0, activity_count integer not null default 0, dependency_count integer not null default 0, calendar_count integer not null default 0, resource_count integer not null default 0, assignment_count integer not null default 0, error_message text);
create table if not exists public.workspace_settings (project_id uuid primary key references public.projects(id) on delete cascade, confidence_threshold numeric not null default 0.90 check(confidence_threshold between 0 and 1), date_format text not null default 'DD MMM YYYY', timezone text not null default 'Asia/Kolkata', retention text not null default 'project', auto_save boolean not null default true, email_notifications boolean not null default true, in_app_notifications boolean not null default true, updated_at timestamptz not null default now());

create index if not exists idx_schedule_calendars_project on public.schedule_calendars(project_id);
create index if not exists idx_schedule_resources_project on public.schedule_resources(project_id);
create index if not exists idx_schedule_dependencies_project on public.schedule_dependencies(project_id);
create index if not exists idx_schedule_dependencies_successor on public.schedule_dependencies(successor_activity_id);
create index if not exists idx_schedule_assignments_project on public.schedule_assignments(project_id);
create index if not exists idx_schedule_assignments_activity on public.schedule_assignments(activity_id);
create index if not exists idx_schedule_imports_project on public.schedule_imports(project_id, imported_at desc);

alter table public.schedule_calendars enable row level security;
alter table public.schedule_resources enable row level security;
alter table public.schedule_dependencies enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.schedule_imports enable row level security;
alter table public.workspace_settings enable row level security;
