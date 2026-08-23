-- Phase 1: Foundation — companies, profiles, company_settings, RLS scaffolding.
-- Company-id-first: every business table added in later phases carries a
-- company_id FK, following the same RLS pattern established here, so the
-- platform stays ready for multi-tenant use later without a redesign.

create extension if not exists "pgcrypto";

-- ===== Tables =====

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locale text not null default 'vi-VN',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'employee');
  end if;
end $$;

-- Bridges auth.users -> company_id + role. employee_id has no FK yet; the
-- `employees` table (and the constraint) is added in the Phase 2 migration.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid,
  role public.user_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles(company_id);

-- One row per company. Values here are placeholders/defaults for formulas
-- (OT rate, KPI bonus, etc.) that are still hard-coded in the prototype UI —
-- real business rules to be confirmed later and just need updating here,
-- not a code change.
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  bhxh_employee_rate numeric not null default 8,
  bhyt_employee_rate numeric not null default 1.5,
  bhtn_employee_rate numeric not null default 1,
  standard_work_days numeric not null default 22,
  kpi_rate_per_day numeric not null default 1.5,
  ot_weekday_percent numeric not null default 150,
  ot_weekend_percent numeric not null default 200,
  kpi_bonus_per_point numeric not null default 500000,
  kpi_bonus_min numeric not null default 2000000,
  session_timeout_minutes integer not null default 60,
  updated_at timestamptz not null default now()
);

-- ===== RLS helper functions =====
-- SECURITY DEFINER so they can read `profiles` without recursing into the
-- RLS policies defined below (the standard Supabase pattern for this).

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false)
$$;

-- ===== RLS =====

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;

-- companies: read-only for members of that company. No insert/update/delete
-- policy on purpose — company creation is a migration/service-role action.
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
  for select to authenticated using (id = public.current_company_id());

-- profiles: everyone can read their own row; admins can read every row in
-- their company. No insert policy — profile rows are created by a Phase 2
-- service-role Edge Function (or manual bootstrap SQL), never directly by
-- the client, to prevent privilege escalation.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or (company_id = public.current_company_id() and public.is_admin())
  );

drop policy if exists "profiles_update_admin_manages_company" on public.profiles;
create policy "profiles_update_admin_manages_company" on public.profiles
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id()
  );

-- company_settings: readable by the whole company, editable by admins only.
drop policy if exists "company_settings_select_own_company" on public.company_settings;
create policy "company_settings_select_own_company" on public.company_settings
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists "company_settings_update_admin_only" on public.company_settings;
create policy "company_settings_update_admin_only" on public.company_settings
  for update to authenticated using (
    company_id = public.current_company_id() and public.is_admin()
  ) with check (
    company_id = public.current_company_id()
  );
