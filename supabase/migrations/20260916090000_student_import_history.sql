-- =============================================================================
-- Bulk student import history
--
-- Records every bulk import: who ran it, what the file contained, what
-- happened to each row, and why rows failed. The uploaded spreadsheet itself is
-- never stored; only the parsed values needed to identify and fix a row.
--
-- How to run:
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run
--   (or `supabase db push` with the Supabase CLI).
-- Safe to run more than once.
--
-- Both tables have row level security enabled with no policies and no
-- privileges for the API roles: only the backend's service role can read or
-- write them, and every read goes through the authenticated admin endpoints.
-- =============================================================================

begin;

create table if not exists public.student_imports (
  id uuid primary key default gen_random_uuid(),
  -- The admin profile that ran the import; kept as a snapshot too, so history
  -- stays readable if the profile is later removed.
  admin_id uuid references public.admins(id) on delete set null,
  admin_auth_user_id uuid,
  admin_name text,
  original_filename text not null,
  file_type text,
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  status text not null default 'previewed' check (
    status in (
      'previewed',            -- file checked, not submitted
      'processing',           -- submitted, insert in progress
      'completed',            -- every row imported
      'completed_with_errors',-- some rows imported, some not
      'failed',               -- nothing imported
      'cancelled'             -- abandoned by an administrator
    )
  ),
  error_summary jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists student_imports_created_at_idx
  on public.student_imports (created_at desc);
create index if not exists student_imports_admin_id_idx
  on public.student_imports (admin_id);
create index if not exists student_imports_admin_auth_user_id_idx
  on public.student_imports (admin_auth_user_id);
create index if not exists student_imports_status_idx
  on public.student_imports (status);

create table if not exists public.student_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.student_imports(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  status text not null check (
    status in ('valid', 'invalid', 'duplicate', 'imported', 'failed', 'skipped')
  ),
  student_id uuid references public.students(id) on delete set null,
  application_number text,
  email text,
  -- Only the spreadsheet values needed to fix and re-upload the row, and only
  -- for rows that were not imported.
  row_data jsonb,
  errors jsonb,
  created_at timestamptz not null default now()
);

create index if not exists student_import_rows_import_id_idx
  on public.student_import_rows (import_id);
create index if not exists student_import_rows_status_idx
  on public.student_import_rows (status);
create unique index if not exists student_import_rows_import_id_row_number_idx
  on public.student_import_rows (import_id, row_number);

alter table public.student_imports enable row level security;
alter table public.student_import_rows enable row level security;

revoke all on table public.student_imports from public, anon, authenticated;
revoke all on table public.student_import_rows from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Interrupted imports
--
-- An import is left in 'processing' if the backend stops mid-import (restart,
-- deploy, crash). The admin UI marks these as interrupted after 30 minutes.
-- Find them:
--
--   select id, original_filename, admin_name, created_at
--   from public.student_imports
--   where status = 'processing'
--     and created_at < now() - interval '30 minutes'
--   order by created_at;
--
-- Check whether its students were saved (student_import_rows shows the rows it
-- recorded), then close it:
--
--   update public.student_imports
--      set status = 'failed',
--          completed_at = now(),
--          error_summary = jsonb_build_object(
--            'type', 'interrupted',
--            'message', 'The import did not finish; closed manually.'
--          )
--    where id = '00000000-0000-0000-0000-000000000000';
-- -----------------------------------------------------------------------------

notify pgrst, 'reload schema';

commit;
