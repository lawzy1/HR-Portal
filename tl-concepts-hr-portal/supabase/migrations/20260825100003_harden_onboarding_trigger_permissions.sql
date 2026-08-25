-- Trigger functions are implementation details, never Data API endpoints.
-- Revoking EXECUTE does not affect PostgreSQL invoking them from their
-- respective table triggers.
revoke all on function public.enforce_employee_self_edit_columns() from public, anon, authenticated;
revoke all on function public.enforce_sensitive_self_edit_columns() from public, anon, authenticated;
