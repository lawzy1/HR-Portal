import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesUpdate } from '../lib/database.types';
import { refreshQueries } from '../lib/queryRefresh';

export type DbEmployee = Tables<'employees'>;
export type DbEmployeeSensitiveInfo = Tables<'employee_sensitive_info'>;
export type DbEmployeeRelative = Tables<'employee_relatives'>;
export type DbEmployeeInvitation = Tables<'employee_invitations'>;

const EMPLOYEES_KEY = ['employees'] as const;
const EMPLOYEE_INVITATIONS_KEY = ['employee_invitations'] as const;

export function useEmployeeInvitations() {
  return useQuery({
    queryKey: EMPLOYEE_INVITATIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_invitations')
        .select('*')
        .order('last_sent_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

interface ManageEmployeeInvitationInput {
  action: 'resend' | 'revoke';
  employeeId: string;
}

interface ManageEmployeeInvitationResult {
  emailDelivered?: boolean;
  actionLink?: string | null;
  revoked?: boolean;
}

export function useManageEmployeeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManageEmployeeInvitationInput) => {
      const { data, error } = await supabase.functions.invoke<ManageEmployeeInvitationResult>('manage-employee-invitation', {
        body: input,
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [EMPLOYEE_INVITATIONS_KEY]);
    },
  });
}

// RLS scopes every query to the caller's own company automatically — no
// company_id filter needed client-side (see employees_select_self_or_admin
// in supabase/migrations/20260822111424_phase2_employees.sql).
export function useEmployees() {
  return useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

interface CreateEmployeeInput {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  startDate: string;
}

// Goes through the create-employee Edge Function (service role) — it also
// invites the auth user and creates the matching `profiles` row, which a
// plain client-side insert cannot do (no INSERT policy on profiles, by
// design — see the Phase 1 migration).
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      const { data, error } = await supabase.functions.invoke<{ employee: DbEmployee }>('create-employee', {
        body: input,
      });
      if (error) throw error;
      return data!.employee;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [EMPLOYEES_KEY, ['profiles'], EMPLOYEE_INVITATIONS_KEY]);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'employees'> }) => {
      const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Employee names, departments, avatars, and salary fields are joined
      // into several back-office lists, so refresh those cached projections
      // together with the employee master record.
      refreshQueries(queryClient, [
        EMPLOYEES_KEY,
        ['profiles'],
        ['contracts'],
        ['salary_history'],
        ['leave_requests'],
        ['ot_records'],
        ['work_events'],
        ['kpi_job_items'],
        ['payroll_records'],
      ]);
    },
  });
}

// Offboarding preserves the record. A separate trusted Edge Function is used
// for the explicit permanent-delete path after an employee has left.
export function useOffboardEmployee() {
  const updateEmployee = useUpdateEmployee();
  return {
    ...updateEmployee,
    mutate: (id: string) => updateEmployee.mutate({ id, updates: { status: 'Đã nghỉ việc' } }),
    mutateAsync: (id: string) => updateEmployee.mutateAsync({ id, updates: { status: 'Đã nghỉ việc' } }),
  };
}

export function useDeleteOffboardedEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.functions.invoke('delete-offboarded-employee', { body: { employeeId } });
      if (error) throw error;
    },
    onSuccess: (_data, employeeId) => {
      queryClient.removeQueries({ queryKey: [...EMPLOYEES_KEY, employeeId] });
      queryClient.removeQueries({ queryKey: ['employee_sensitive_info', employeeId] });
      queryClient.removeQueries({ queryKey: ['employee_relatives', employeeId] });
      refreshQueries(queryClient, [
        EMPLOYEES_KEY,
        ['employee_sensitive_info'],
        ['employee_relatives'],
        EMPLOYEE_INVITATIONS_KEY,
        ['profiles'],
      ]);
    },
  });
}

// ===== employee_sensitive_info (CCCD/MST/BHXH/bank) — 1:1 with employees =====

export function useEmployeeSensitiveInfo(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_sensitive_info', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_sensitive_info')
        .select('*')
        .eq('employee_id', employeeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

// Admin-only company-wide read (RLS enforces this server-side too) — used
// for dashboard/reminder rollups like the missing-documents count, without
// fetching the full sensitive record (bank info, ID numbers) per employee.
export function useAllEmployeeSensitiveInfo() {
  return useQuery({
    queryKey: ['employee_sensitive_info', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_sensitive_info')
        .select('employee_id, id_card_front_url, tax_code');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertEmployeeSensitiveInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      companyId,
      updates,
    }: {
      employeeId: string;
      companyId: string;
      updates: Omit<TablesUpdate<'employee_sensitive_info'>, 'employee_id' | 'company_id'>;
    }) => {
      const { data, error } = await supabase
        .from('employee_sensitive_info')
        .upsert({ employee_id: employeeId, company_id: companyId, ...updates }, { onConflict: 'employee_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['employee_sensitive_info']]);
    },
  });
}

// ===== employee_relatives =====

export function useEmployeeRelatives(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_relatives', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_relatives')
        .select('*')
        .eq('employee_id', employeeId!);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export interface RelativeInput {
  fullName: string;
  relationship: string;
  phone: string;
  address: string;
  isEmergencyContact: boolean;
}

// Small list (a handful of rows at most) — replace-the-whole-set is simpler
// and just as correct as a diff/patch here, and avoids stale-id bugs.
export function useSetEmployeeRelatives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      companyId,
      relatives,
    }: {
      employeeId: string;
      companyId: string;
      relatives: RelativeInput[];
    }) => {
      const { error: deleteError } = await supabase
        .from('employee_relatives')
        .delete()
        .eq('employee_id', employeeId);
      if (deleteError) throw deleteError;

      if (relatives.length === 0) return [];

      const { data, error: insertError } = await supabase
        .from('employee_relatives')
        .insert(
          relatives.map((r) => ({
            employee_id: employeeId,
            company_id: companyId,
            full_name: r.fullName,
            relationship: r.relationship,
            phone: r.phone,
            address: r.address,
            is_emergency_contact: r.isEmergencyContact,
          }))
        )
        .select();
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      refreshQueries(queryClient, [['employee_relatives']]);
    },
  });
}
