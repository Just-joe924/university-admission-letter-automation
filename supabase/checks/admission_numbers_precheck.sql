-- =============================================================================
-- Read-only checks to run BEFORE
-- migrations/20260915120000_concurrency_safe_admission_numbers.sql
--
-- Nothing in this file changes data. Run each query in the Supabase SQL Editor
-- and review the results.
-- =============================================================================

-- 1. Duplicate admission numbers. Must return no rows, otherwise the migration
--    stops. Decide which student keeps the number before running it.
select admission_number,
       count(*) as students,
       array_agg(id order by created_at) as student_ids
from public.students
where admission_number is not null
group by admission_number
having count(*) > 1;

-- 2. Students with no admission number. NOT NULL is only added when this is empty.
select id, full_name, session, created_at
from public.students
where admission_number is null or btrim(admission_number) = '';

-- 3. Admission numbers that don't match ADM/<year>/<number>. They are left as
--    they are; generated numbers always have the ADM/<year>/<number> shape, so
--    they cannot collide with these.
select id, full_name, admission_number, session, created_at
from public.students
where admission_number is not null
  and admission_number !~ '^ADM/[0-9]{4}/[0-9]+$';

-- 4. Numbers whose year differs from the session's starting year (informational).
select id, full_name, admission_number, session
from public.students
where admission_number ~ '^ADM/[0-9]{4}/[0-9]+$'
  and split_part(admission_number, '/', 2) <> split_part(session, '/', 1);

-- 5. Highest existing number per year: each year's counter will start here.
select (regexp_match(admission_number, '^ADM/([0-9]{4})/'))[1] as year,
       max((regexp_match(admission_number, '^ADM/[0-9]{4}/([0-9]+)$'))[1]::bigint) as highest_number
from public.students
where admission_number ~ '^ADM/[0-9]{4}/[0-9]+$'
group by 1
order by 1;

-- 6. Existing unique indexes on students (shows whether admission_number, email
--    and application_number are already unique).
select indexrelid::regclass as index_name,
       pg_get_indexdef(indexrelid) as definition
from pg_index
where indrelid = 'public.students'::regclass
  and indisunique;

-- 7. Has the migration already been applied?
select to_regclass('public.admission_number_counters') is not null as counters_table_exists;
