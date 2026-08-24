-- service_role (used exclusively server-side by Edge Functions, never
-- exposed to a client) had no SELECT/INSERT/UPDATE/DELETE grants on any
-- table — only REFERENCES/TRIGGER/TRUNCATE, which Postgres grants new
-- roles by default. It bypasses RLS, but RLS bypass doesn't matter if the
-- base GRANT is missing first (same root cause as the earlier
-- 'authenticated' 42501 bug, different role).
--
-- Fixed two ways: (1) grant on every existing table now, (2) ALTER DEFAULT
-- PRIVILEGES so any table created in future migrations grants to
-- service_role automatically — this class of bug should not recur.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
