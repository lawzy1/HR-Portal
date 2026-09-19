create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  category text not null default 'announcement'
    check (category in ('announcement', 'holiday', 'policy', 'authorization', 'discipline')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  attachment_path text,
  attachment_name text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  constraint announcements_attachment_consistency check (
    (attachment_path is null and attachment_name is null and attachment_size is null)
    or (
      attachment_path is not null
      and attachment_name is not null
      and attachment_size between 1 and 6291456
    )
  )
);

create index announcements_company_created_idx
  on public.announcements(company_id, created_at desc);
create index announcements_author_profile_id_idx
  on public.announcements(author_profile_id);

alter table public.announcements enable row level security;

create policy "announcements_select_own_company" on public.announcements
  for select to authenticated
  using (company_id = (select public.current_company_id()));

create policy "announcements_insert_admin_only" on public.announcements
  for insert to authenticated
  with check (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
    and author_profile_id = (select auth.uid())
  );

create policy "announcements_delete_admin_only" on public.announcements
  for delete to authenticated
  using (
    company_id = (select public.current_company_id())
    and (select public.is_admin())
  );

grant select, insert, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-announcements', 'company-announcements', false, 6291456, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "company_announcements_select_own_company" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-announcements'
    and (storage.foldername(name))[1] = (select public.current_company_id())::text
  );

create policy "company_announcements_insert_admin_only" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-announcements'
    and (storage.foldername(name))[1] = (select public.current_company_id())::text
    and (select public.is_admin())
  );

create policy "company_announcements_delete_admin_only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-announcements'
    and (storage.foldername(name))[1] = (select public.current_company_id())::text
    and (select public.is_admin())
  );

revoke all on function public.audit_row_change() from public, anon, authenticated;

create trigger audit_announcements_changes
  after insert or delete on public.announcements
  for each row execute function public.audit_row_change();
