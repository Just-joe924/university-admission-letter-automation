-- =============================================================================
-- Concurrency-safe admission numbers
--
-- Replaces the backend's "highest existing number + 1" calculation with a
-- database trigger. Every student INSERT without an admission number gets the
-- next number for its session's starting year, in the existing format:
--
--     ADM/<session start year>/<sequence, at least 5 digits>
--
-- Numbers restart at 00001 for each year, exactly like the old generator.
--
-- Why this is safe:
--   * The number comes from admission_number_counters while holding a row lock
--     on that year's counter until the inserting transaction ends. Concurrent
--     inserts (manual, bulk import, any number of backend instances) wait for
--     each other instead of reading the same value.
--   * The counter change rolls back with a failed insert, so failed or retried
--     requests never burn or reuse a number.
--   * A UNIQUE constraint on students.admission_number is the final guarantee.
--
-- Existing data:
--   * No existing admission number is changed.
--   * Each year's counter starts after the highest existing ADM/<year>/<n>.
--   * If duplicate admission numbers already exist, the migration stops and
--     changes nothing.
--
-- How to run:
--   1. Run supabase/checks/admission_numbers_precheck.sql and review the output.
--   2. Supabase Dashboard -> SQL Editor -> paste this whole file -> Run
--      (or `supabase db push` with the Supabase CLI).
--   3. Deploy the backend that relies on it. Until this migration has run, the
--      new backend refuses to create students instead of saving them without
--      an admission number.
--
-- Safe to run more than once.
-- =============================================================================

begin;

-- Block writes to students while numbering is switched over, so no student can
-- be created between seeding the counters and installing the trigger.
lock table public.students in share row exclusive mode;

-- 1. Stop if admission numbers are already duplicated -------------------------
do $$
declare
  v_duplicates text;
begin
  select string_agg(format('%s (%s students)', admission_number, total), ', ')
    into v_duplicates
  from (
    select admission_number, count(*) as total
    from public.students
    where admission_number is not null
    group by admission_number
    having count(*) > 1
  ) duplicates;

  if v_duplicates is not null then
    raise exception 'Duplicate admission numbers must be fixed before this migration can run: %', v_duplicates
      using hint = 'Review them with supabase/checks/admission_numbers_precheck.sql. No changes were made.';
  end if;
end
$$;

-- 2. One counter per admission year -------------------------------------------
create table if not exists public.admission_number_counters (
  year integer primary key check (year between 0 and 9999),
  last_value bigint not null check (last_value >= 0),
  updated_at timestamptz not null default now()
);

-- Only the database itself uses the counters: RLS on with no policies, and no
-- table privileges for API roles.
alter table public.admission_number_counters enable row level security;
revoke all on table public.admission_number_counters from public, anon, authenticated;

-- Start each year after its highest existing number. GREATEST means running the
-- migration again can never move a counter backwards.
insert into public.admission_number_counters as counters (year, last_value)
select parts[1]::integer, max(parts[2]::bigint)
from (
  select regexp_match(admission_number, '^ADM/([0-9]{4})/([0-9]+)$') as parts
  from public.students
) numbered
where parts is not null
group by parts[1]
on conflict (year) do update
  set last_value = greatest(counters.last_value, excluded.last_value),
      updated_at = now();

-- 3. Numbering functions ------------------------------------------------------

-- "2025/2026" -> 2025. Falls back to the current year, like the old generator.
create or replace function public.admission_number_year(p_session text)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (regexp_match(p_session, '^\s*([0-9]{4})\s*/'))[1]::integer,
    extract(year from now())::integer
  );
$$;

-- Same format as before: at least 5 digits, never truncated.
create or replace function public.format_admission_number(p_year integer, p_sequence bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ADM/' || p_year::text || '/' ||
    case
      when length(p_sequence::text) >= 5 then p_sequence::text
      else lpad(p_sequence::text, 5, '0')
    end;
$$;

-- Returns the next sequence value for a year. The UPDATE (or the conflicting
-- INSERT) takes a row lock that is held until the caller's transaction ends.
create or replace function public.next_admission_sequence(p_year integer)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_next bigint;
begin
  update public.admission_number_counters
     set last_value = last_value + 1,
         updated_at = now()
   where year = p_year
  returning last_value into v_next;

  if not found then
    -- First number for this year. If two transactions get here at once, one
    -- inserts and the other takes the ON CONFLICT path after it commits.
    insert into public.admission_number_counters as counters (year, last_value)
    values (
      p_year,
      1 + coalesce((
        select max((regexp_match(s.admission_number, '^ADM/[0-9]{4}/([0-9]+)$'))[1]::bigint)
        from public.students s
        where s.admission_number like ('ADM/' || p_year::text || '/%')
      ), 0)
    )
    on conflict (year) do update
      set last_value = counters.last_value + 1,
          updated_at = now()
    returning last_value into v_next;
  end if;

  return v_next;
end;
$$;

-- BEFORE INSERT trigger: assigns a number when none is given. An explicit
-- number (e.g. loaded by a database administrator) is kept, and the counter is
-- moved past it so it is never issued again.
create or replace function public.assign_admission_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer;
  v_parts text[];
begin
  if new.admission_number is null or btrim(new.admission_number) = '' then
    v_year := public.admission_number_year(new.session);
    new.admission_number := public.format_admission_number(
      v_year,
      public.next_admission_sequence(v_year)
    );
  else
    v_parts := regexp_match(new.admission_number, '^ADM/([0-9]{4})/([0-9]+)$');

    if v_parts is not null then
      insert into public.admission_number_counters as counters (year, last_value)
      values (v_parts[1]::integer, v_parts[2]::bigint)
      on conflict (year) do update
        set last_value = greatest(counters.last_value, excluded.last_value),
            updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists students_assign_admission_number on public.students;
create trigger students_assign_admission_number
  before insert on public.students
  for each row
  execute function public.assign_admission_number();

-- Lets the backend confirm numbering is active before it creates students.
create or replace function public.admission_numbering_ready()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.students'::regclass
      and tgname = 'students_assign_admission_number'
      and tgenabled <> 'D'
  );
$$;

-- API roles must not be able to call the numbering functions directly (that
-- would let anyone burn numbers). The trigger runs as its owner, so inserts
-- still work for every role that may insert students.
revoke all on function public.admission_number_year(text) from public, anon, authenticated, service_role;
revoke all on function public.format_admission_number(integer, bigint) from public, anon, authenticated, service_role;
revoke all on function public.next_admission_sequence(integer) from public, anon, authenticated, service_role;
revoke all on function public.assign_admission_number() from public, anon, authenticated, service_role;
revoke all on function public.admission_numbering_ready() from public, anon, authenticated;
grant execute on function public.admission_numbering_ready() to service_role;

-- 4. Uniqueness ----------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index i
    join pg_catalog.pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'public.students'::regclass
      and i.indisunique
      and i.indnkeyatts = 1
      and i.indpred is null
      and a.attname = 'admission_number'
  ) then
    alter table public.students
      add constraint students_admission_number_key unique (admission_number);
  end if;
end
$$;

-- Every new student gets a number from the trigger, so NOT NULL is added when
-- existing data allows it. Existing rows are never modified to make it fit.
do $$
begin
  if exists (select 1 from public.students where admission_number is null) then
    raise notice 'Some students have no admission number, so NOT NULL was not added. Existing rows were left unchanged.';
  else
    alter table public.students alter column admission_number set not null;
  end if;
end
$$;

-- Make the new function visible to the Supabase API immediately.
notify pgrst, 'reload schema';

commit;
