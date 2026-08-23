import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesUpdate } from '../lib/database.types';

export type DbEmployee = Tables<'employees'>;

const EMPLOYEES_KEY = ['employees'] as const;

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
  fullName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  startDate?: string;
  contractType?: string;
  currentSalary?: number;
  status?: string;
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
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
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
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
}

// Soft delete only — see the Phase 2 migration comment on why there is no
// DELETE policy on `employees` at all.
export function useOffboardEmployee() {
  const updateEmployee = useUpdateEmployee();
  return {
    ...updateEmployee,
    mutate: (id: string) => updateEmployee.mutate({ id, updates: { status: 'Đã nghỉ việc' } }),
    mutateAsync: (id: string) => updateEmployee.mutateAsync({ id, updates: { status: 'Đã nghỉ việc' } }),
  };
}
