-- "Đã đọc" state for the generated HR reminders, per account. Reminders
-- themselves are derived from live data (pending requests, missing docs...)
-- and disappear when that data is resolved; this only stores dismissals so
-- they survive reloads and follow the user across devices.
create table public.reminder_reads (
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reminder_id text not null check (char_length(reminder_id) between 1 and 200),
  read_at timestamptz not null default now(),
  primary key (profile_id, reminder_id)
);

alter table public.reminder_reads enable row level security;

create policy "reminder_reads_select_own" on public.reminder_reads
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "reminder_reads_insert_own" on public.reminder_reads
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

grant select, insert on public.reminder_reads to authenticated;
grant all on public.reminder_reads to service_role;
