import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';
import { refreshQueries } from '../lib/queryRefresh';

export type DbProfile = Tables<'profiles'>;

type BackofficeRole = 'admin' | 'hr';

interface CreateBackofficeAccountInput {
  email: string;
  role: BackofficeRole;
}

// Admin-only company-wide list (RLS enforces this server-side too) — every
// profile joined with its employee record, for the role-assignment table.
// Account and role management stays Admin-only. HR/Kế toán receives access
// to business tables through `is_backoffice()`, never through this hook.
export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, employees(full_name, employee_code, job_title, department, email, avatar_url)')
        .not('employee_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: 'admin' | 'hr' | 'employee' }) => {
      const { data, error } = await supabase.from('profiles').update({ role }).eq('id', profileId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['profiles']]);
    },
  });
}

// Creating privileged accounts always goes through a trusted Edge Function;
// the browser never receives a service-role key or a way to insert profiles.
export function useCreateBackofficeAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBackofficeAccountInput) => {
      const { data, error } = await supabase.functions.invoke<{ email: string; role: BackofficeRole }>('create-backoffice-account', {
        body: input,
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['profiles']]);
    },
  });
}

// Lets an admin/hr account link itself to a lightweight employees record
// (name + job title/department, no leave/payroll fields) so it shows up in
// KPI assignment. See link_self_employee_profile in
// 20260902130000_admin_self_employee_link.sql.
interface LinkSelfEmployeeProfileInput {
  fullName: string;
  jobTitle: string;
  department: string;
  kpiLevel: string;
  kpiTargetPerDay: number | '';
  performanceCommissionRate: number;
  qcCommissionRate: number;
  guaranteedIncomeAmount: number;
}

export function useLinkSelfEmployeeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LinkSelfEmployeeProfileInput) => {
      const { data, error } = await supabase.rpc('link_self_employee_profile', {
        p_full_name: input.fullName,
        p_job_title: input.jobTitle,
        p_department: input.department,
        p_kpi_level: input.kpiLevel,
        p_kpi_target_per_day: input.kpiTargetPerDay === '' ? undefined : input.kpiTargetPerDay,
        p_performance_commission_rate: input.performanceCommissionRate,
        p_qc_commission_rate: input.qcCommissionRate,
        p_guaranteed_income_amount: input.guaranteedIncomeAmount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['profiles'], ['employees']]);
    },
  });
}

// Undoes useLinkSelfEmployeeProfile: detaches profiles.employee_id and
// removes (or offboards) the employees record it created. See
// unlink_self_employee_profile in 20260903100000_admin_self_employee_unlink.sql.
export function useUnlinkSelfEmployeeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('unlink_self_employee_profile');
      if (error) throw error;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['profiles'], ['employees']]);
    },
  });
}

export function useReviewEmployeeOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, decision, note }: { profileId: string; decision: 'approved' | 'needs_changes'; note?: string }) => {
      const { error } = await supabase.rpc('review_employee_onboarding', {
        p_profile_id: profileId,
        p_decision: decision,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['profiles'], ['employees']]);
    },
  });
}
