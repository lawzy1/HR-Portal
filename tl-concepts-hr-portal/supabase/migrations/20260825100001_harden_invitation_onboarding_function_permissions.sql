-- The prior migration version is later than this workstation's clock, so this
-- follow-up intentionally uses the next version after the applied workflow.
-- Helpers are used by RLS for signed-in users only and must never be callable
-- through the anonymous Data API.

revoke execute on function public.current_company_id() from public, anon;
revoke execute on function public.current_employee_id() from public, anon;
revoke execute on function public.current_onboarding_employee_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;

grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_onboarding_employee_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
