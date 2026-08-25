-- An employee record and their access invitation have separate lifecycles.
-- The profile may stay pending while an expired or revoked invitation is
-- replaced; the employee dossier itself is never discarded as a side effect.

alter table public.employee_invitations
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_opened_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists resend_count integer not null default 0,
  add column if not exists last_email_error text;

update public.employee_invitations
set expires_at = last_sent_at + interval '1 hour'
where expires_at is null;

update public.employee_invitations i
set accepted_at = coalesce(i.accepted_at, now()),
    last_opened_at = coalesce(i.last_opened_at, now())
from public.profiles p
where p.id = i.auth_user_id
  and p.onboarding_status in ('in_progress', 'needs_changes', 'submitted', 'approved');

alter table public.employee_invitations
  alter column expires_at set default (now() + interval '1 hour'),
  alter column expires_at set not null,
  add constraint employee_invitations_resend_count_check check (resend_count >= 0);

create index if not exists employee_invitations_company_pending_idx
  on public.employee_invitations (company_id, expires_at)
  where revoked_at is null and completed_at is null;

grant select on table public.employee_invitations to authenticated;

alter table public.profiles
  drop constraint if exists profiles_onboarding_status_check;

alter table public.profiles
  add constraint profiles_onboarding_status_check
  check (onboarding_status in ('invited', 'in_progress', 'submitted', 'needs_changes', 'approved', 'revoked'));

-- A revoked invite immediately removes the onboarding-only RLS exception.
-- Expiry is intentionally not checked here: once the employee has entered
-- through a valid link, they can safely resume their unfinished dossier by
-- signing in with the password they already created.
create or replace function public.current_onboarding_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_id
  from public.profiles p
  join public.employee_invitations i on i.auth_user_id = p.id
  where p.id = auth.uid()
    and not p.is_active
    and p.onboarding_status in ('in_progress', 'needs_changes')
    and i.revoked_at is null
$$;

-- The activation screen writes accepted_at before it enables the password
-- form. After that, the employee may resume via password even if the old
-- email link has expired; a link never opened in the portal cannot bypass its
-- expiry merely by creating an Auth session.
create or replace function public.start_own_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation_id uuid;
begin
  select i.id into v_invitation_id
  from public.employee_invitations i
  join public.profiles p on p.id = i.auth_user_id
  where i.auth_user_id = auth.uid()
    and p.is_active = false
    and p.onboarding_status = 'invited'
    and i.revoked_at is null
    and (i.expires_at > now() or i.accepted_at is not null)
  for update of i;

  if v_invitation_id is null then
    raise exception 'Lời mời đã hết hạn hoặc đã được thu hồi. Vui lòng liên hệ Admin để nhận link mới.';
  end if;

  update public.profiles
  set onboarding_status = 'in_progress', onboarding_note = null
  where id = auth.uid();

  update public.employee_invitations
  set accepted_at = coalesce(accepted_at, now()),
      last_opened_at = now(),
      last_email_error = null
  where id = v_invitation_id;
end;
$$;

create or replace function public.mark_own_invitation_opened()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.employee_invitations i
  set accepted_at = coalesce(i.accepted_at, now()),
      last_opened_at = now()
  from public.profiles p
  where i.auth_user_id = auth.uid()
    and p.id = auth.uid()
    and not p.is_active
    and p.onboarding_status = 'invited'
    and i.revoked_at is null
    and i.expires_at > now();

  if not found then
    raise exception 'Lời mời đã hết hạn hoặc đã được thu hồi. Vui lòng liên hệ Admin để nhận link mới.';
  end if;
end;
$$;

create or replace function public.submit_own_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid;
begin
  select p.employee_id into v_employee_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = false
    and p.onboarding_status in ('in_progress', 'needs_changes');

  if v_employee_id is null then
    raise exception 'Hồ sơ không ở trạng thái có thể gửi';
  end if;

  if not exists (
    select 1 from public.employee_sensitive_info s
    where s.employee_id = v_employee_id
      and nullif(trim(s.id_card_number), '') is not null
      and s.id_card_front_url is not null
      and s.id_card_back_url is not null
  ) then
    raise exception 'Cần hoàn thành CCCD và tải đủ hai mặt trước khi gửi';
  end if;

  update public.profiles
  set onboarding_status = 'submitted', onboarding_submitted_at = now(), onboarding_note = null
  where id = auth.uid();

  update public.employee_invitations
  set completed_at = now()
  where auth_user_id = auth.uid() and revoked_at is null;

  update public.employees set status = 'Chờ duyệt hồ sơ', updated_at = now() where id = v_employee_id;
end;
$$;

-- The newer atomic submit RPC is the normal browser path; keep lifecycle
-- metadata consistent there as well.
create or replace function public.mark_own_invitation_completed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.employee_invitations
  set completed_at = now()
  where auth_user_id = auth.uid() and revoked_at is null;
end;
$$;

-- The browser submits through save_and_submit_own_onboarding(), but completion
-- is recorded in a trigger so a direct RPC call cannot leave lifecycle data
-- stale if the client disconnects after the transaction commits.
create or replace function public.complete_invitation_on_onboarding_submit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarding_status = 'submitted'
     and new.onboarding_status is distinct from old.onboarding_status then
    update public.employee_invitations
    set completed_at = coalesce(completed_at, now())
    where auth_user_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists complete_employee_invitation_on_submission on public.profiles;
create trigger complete_employee_invitation_on_submission
  after update of onboarding_status on public.profiles
  for each row execute function public.complete_invitation_on_onboarding_submit();

revoke all on function public.mark_own_invitation_opened() from public, anon;
revoke all on function public.mark_own_invitation_completed() from public, anon;
revoke all on function public.complete_invitation_on_onboarding_submit() from public, anon, authenticated;
grant execute on function public.mark_own_invitation_opened() to authenticated;
grant execute on function public.mark_own_invitation_completed() to authenticated;
