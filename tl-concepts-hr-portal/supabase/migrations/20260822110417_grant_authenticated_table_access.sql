-- Tables created via raw SQL don't get the Data API's default privilege
-- grants the way tables created through the Table Editor do. RLS policies
-- only take effect once the base GRANT exists; without it PostgREST returns
-- 42501 "permission denied" before RLS is even evaluated. Discovered live
-- against this project after the foundation migration — folded in here as
-- its own migration to match what was actually applied, rather than
-- rewriting foundation's history.
grant usage on schema public to authenticated;

grant select on public.companies to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.company_settings to authenticated;
