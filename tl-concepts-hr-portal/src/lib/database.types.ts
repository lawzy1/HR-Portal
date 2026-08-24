// Generated from the live Supabase schema via `mcp__supabase__generate_typescript_types`.
// Regenerate after every migration instead of hand-editing.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          id: string
          locale: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          name?: string
        }
        Relationships: []
      }
      company_holidays: {
        Row: {
          company_id: string
          date: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          date: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          bhtn_employee_rate: number
          bhxh_employee_rate: number
          bhyt_employee_rate: number
          company_id: string
          family_deduction: number
          id: string
          kpi_bonus_min: number
          kpi_bonus_per_point: number
          kpi_rate_per_day: number
          ot_weekday_percent: number
          ot_weekend_percent: number
          personal_income_tax_rate: number
          session_timeout_minutes: number
          standard_work_days: number
          updated_at: string
        }
        Insert: {
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id: string
          family_deduction?: number
          id?: string
          kpi_bonus_min?: number
          kpi_bonus_per_point?: number
          kpi_rate_per_day?: number
          ot_weekday_percent?: number
          ot_weekend_percent?: number
          personal_income_tax_rate?: number
          session_timeout_minutes?: number
          standard_work_days?: number
          updated_at?: string
        }
        Update: {
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id?: string
          family_deduction?: number
          id?: string
          kpi_bonus_min?: number
          kpi_bonus_per_point?: number
          kpi_rate_per_day?: number
          ot_weekday_percent?: number
          ot_weekend_percent?: number
          personal_income_tax_rate?: number
          session_timeout_minutes?: number
          standard_work_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string
          contract_code: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          note: string | null
          position: string | null
          salary: number | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          company_id: string
          contract_code: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          note?: string | null
          position?: string | null
          salary?: number | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          company_id?: string
          contract_code?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          note?: string | null
          position?: string | null
          salary?: number | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_relatives: {
        Row: {
          address: string | null
          company_id: string
          employee_id: string
          full_name: string
          id: string
          is_emergency_contact: boolean
          phone: string | null
          relationship: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          employee_id: string
          full_name: string
          id?: string
          is_emergency_contact?: boolean
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          employee_id?: string
          full_name?: string
          id?: string
          is_emergency_contact?: boolean
          phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_relatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_relatives_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sensitive_info: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          company_id: string
          employee_id: string
          id_card_back_url: string | null
          id_card_front_url: string | null
          id_card_issue_date: string | null
          id_card_issue_place: string | null
          id_card_number: string | null
          identity_verification_note: string | null
          identity_verification_status: string
          identity_verified_at: string | null
          identity_verified_by: string | null
          social_insurance_code: string | null
          tax_code: string | null
          updated_at: string
          vneid_residency_url: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_id: string
          employee_id: string
          id_card_back_url?: string | null
          id_card_front_url?: string | null
          id_card_issue_date?: string | null
          id_card_issue_place?: string | null
          id_card_number?: string | null
          identity_verification_note?: string | null
          identity_verification_status?: string
          identity_verified_at?: string | null
          identity_verified_by?: string | null
          social_insurance_code?: string | null
          tax_code?: string | null
          updated_at?: string
          vneid_residency_url?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_id?: string
          employee_id?: string
          id_card_back_url?: string | null
          id_card_front_url?: string | null
          id_card_issue_date?: string | null
          id_card_issue_place?: string | null
          id_card_number?: string | null
          identity_verification_note?: string | null
          identity_verification_status?: string
          identity_verified_at?: string | null
          identity_verified_by?: string | null
          social_insurance_code?: string | null
          tax_code?: string | null
          updated_at?: string
          vneid_residency_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_sensitive_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_sensitive_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          company_id: string
          contract_type: string | null
          created_at: string
          current_salary: number | null
          department: string | null
          dob: string | null
          email: string | null
          employee_code: string
          full_name: string
          gender: string | null
          id: string
          job_title: string | null
          last_salary_review_date: string | null
          marital_status: string | null
          permanent_address: string | null
          phone: string | null
          start_date: string | null
          status: string
          temporary_address: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          contract_type?: string | null
          created_at?: string
          current_salary?: number | null
          department?: string | null
          dob?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          gender?: string | null
          id?: string
          job_title?: string | null
          last_salary_review_date?: string | null
          marital_status?: string | null
          permanent_address?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          temporary_address?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          contract_type?: string | null
          created_at?: string
          current_salary?: number | null
          department?: string | null
          dob?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          gender?: string | null
          id?: string
          job_title?: string | null
          last_salary_review_date?: string | null
          marital_status?: string | null
          permanent_address?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string
          temporary_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_adjustments: {
        Row: {
          amount: number
          company_id: string
          id: string
          kpi_monthly_id: string
          reason: string | null
          title: string
          type: string
        }
        Insert: {
          amount: number
          company_id: string
          id?: string
          kpi_monthly_id: string
          reason?: string | null
          title: string
          type: string
        }
        Update: {
          amount?: number
          company_id?: string
          id?: string
          kpi_monthly_id?: string
          reason?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_adjustments_kpi_monthly_id_fkey"
            columns: ["kpi_monthly_id"]
            isOneToOne: false
            referencedRelation: "kpi_monthly"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_job_items: {
        Row: {
          company_id: string
          completed_at: string | null
          converted_kpi: number | null
          created_at: string
          deadline: string | null
          deadline_at: string | null
          duration_days: number | null
          employee_id: string
          id: string
          month: number
          order_job: string
          parent_task: string | null
          sub_task: string | null
          views_count: number | null
          year: number
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          converted_kpi?: number | null
          created_at?: string
          deadline?: string | null
          deadline_at?: string | null
          duration_days?: number | null
          employee_id: string
          id?: string
          month: number
          order_job: string
          parent_task?: string | null
          sub_task?: string | null
          views_count?: number | null
          year: number
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          converted_kpi?: number | null
          created_at?: string
          deadline?: string | null
          deadline_at?: string | null
          duration_days?: number | null
          employee_id?: string
          id?: string
          month?: number
          order_job?: string
          parent_task?: string | null
          sub_task?: string | null
          views_count?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_job_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_job_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_monthly: {
        Row: {
          benefit_amount: number | null
          bonus_amount: number | null
          company_id: string
          completion_percentage: number | null
          created_at: string
          employee_id: string
          id: string
          kpi_converted_views: number | null
          kpi_target: number | null
          month: number
          notes: string | null
          ot_hourly_rate: number | null
          ot_hours: number | null
          rendered_views_actual: number | null
          year: number
        }
        Insert: {
          benefit_amount?: number | null
          bonus_amount?: number | null
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          employee_id: string
          id?: string
          kpi_converted_views?: number | null
          kpi_target?: number | null
          month: number
          notes?: string | null
          ot_hourly_rate?: number | null
          ot_hours?: number | null
          rendered_views_actual?: number | null
          year: number
        }
        Update: {
          benefit_amount?: number | null
          bonus_amount?: number | null
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          kpi_converted_views?: number | null
          kpi_target?: number | null
          month?: number
          notes?: string | null
          ot_hourly_rate?: number | null
          ot_hours?: number | null
          rendered_views_actual?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_monthly_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_monthly_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance_adjustments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          reason: string
          year: number
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          reason: string
          year: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          reason?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balance_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          annual_entitlement: number
          company_id: string
          employee_id: string
          expiry_date: string | null
          id: string
          manual_adjustment: number
          pending_days: number
          remaining_days: number | null
          total_accumulated: number
          used_days: number
          year: number
        }
        Insert: {
          annual_entitlement?: number
          company_id: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          manual_adjustment?: number
          pending_days?: number
          remaining_days?: number | null
          total_accumulated?: number
          used_days?: number
          year: number
        }
        Update: {
          annual_entitlement?: number
          company_id?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          manual_adjustment?: number
          pending_days?: number
          remaining_days?: number | null
          total_accumulated?: number
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_comment: string | null
          approver_id: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string
          half_day_option: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          total_days: number
        }
        Insert: {
          approver_comment?: string | null
          approver_id?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date: string
          half_day_option?: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string
          total_days: number
        }
        Update: {
          approver_comment?: string | null
          approver_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          half_day_option?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          total_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_records: {
        Row: {
          amount: number | null
          approver_id: string | null
          company_id: string
          created_at: string
          date: string
          employee_id: string
          hours: number
          id: string
          ot_percentage: number | null
          pay_type: string | null
          reason: string | null
          status: string
          views_render_count: number | null
        }
        Insert: {
          amount?: number | null
          approver_id?: string | null
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          hours: number
          id?: string
          ot_percentage?: number | null
          pay_type?: string | null
          reason?: string | null
          status?: string
          views_render_count?: number | null
        }
        Update: {
          amount?: number | null
          approver_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          hours?: number
          id?: string
          ot_percentage?: number | null
          pay_type?: string | null
          reason?: string | null
          status?: string
          views_render_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_records_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          actual_work_days: number
          advance_payment: number
          base_salary: number
          bhtn_deduction: number
          bhxh_deduction: number
          bhyt_deduction: number
          company_id: string
          created_at: string
          employee_id: string
          family_deduction: number
          gross_income: number
          id: string
          import_source_name: string | null
          kpi_bonus: number
          lunch_allowance: number
          month: number
          net_salary: number
          note: string | null
          ot_hours: number
          ot_pay: number
          other_deductions: number
          payment_date: string | null
          payment_status: string
          personal_income_tax: number
          phone_allowance: number
          prior_month_adjustment: number
          project_bonus_amount: number
          publish_status: string
          published_at: string | null
          published_by: string | null
          standard_work_days: number
          tax_exempt_income: number
          taxable_income: number
          year: number
        }
        Insert: {
          actual_work_days?: number
          advance_payment?: number
          base_salary?: number
          bhtn_deduction?: number
          bhxh_deduction?: number
          bhyt_deduction?: number
          company_id: string
          created_at?: string
          employee_id: string
          family_deduction?: number
          gross_income?: number
          id?: string
          import_source_name?: string | null
          kpi_bonus?: number
          lunch_allowance?: number
          month: number
          net_salary?: number
          note?: string | null
          ot_hours?: number
          ot_pay?: number
          other_deductions?: number
          payment_date?: string | null
          payment_status?: string
          personal_income_tax?: number
          phone_allowance?: number
          prior_month_adjustment?: number
          project_bonus_amount?: number
          publish_status?: string
          published_at?: string | null
          published_by?: string | null
          standard_work_days?: number
          tax_exempt_income?: number
          taxable_income?: number
          year: number
        }
        Update: {
          actual_work_days?: number
          advance_payment?: number
          base_salary?: number
          bhtn_deduction?: number
          bhxh_deduction?: number
          bhyt_deduction?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          family_deduction?: number
          gross_income?: number
          id?: string
          import_source_name?: string | null
          kpi_bonus?: number
          lunch_allowance?: number
          month?: number
          net_salary?: number
          note?: string | null
          ot_hours?: number
          ot_pay?: number
          other_deductions?: number
          payment_date?: string | null
          payment_status?: string
          personal_income_tax?: number
          phone_allowance?: number
          prior_month_adjustment?: number
          project_bonus_amount?: number
          publish_status?: string
          published_at?: string | null
          published_by?: string | null
          standard_work_days?: number
          tax_exempt_income?: number
          taxable_income?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_events: {
        Row: {
          approver_comment: string | null
          approver_id: string | null
          company_id: string
          created_at: string
          employee_id: string
          event_date: string
          event_type: string
          id: string
          minutes: number | null
          reason: string
          status: string
        }
        Insert: {
          approver_comment?: string | null
          approver_id?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          event_date: string
          event_type: string
          id?: string
          minutes?: number | null
          reason: string
          status?: string
        }
        Update: {
          approver_comment?: string | null
          approver_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          event_date?: string
          event_type?: string
          id?: string
          minutes?: number | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          approved_by: string | null
          change_type: string | null
          company_id: string
          created_at: string
          effective_date: string
          employee_id: string
          id: string
          new_salary: number
          old_salary: number | null
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          change_type?: string | null
          company_id: string
          created_at?: string
          effective_date: string
          employee_id: string
          id?: string
          new_salary: number
          old_salary?: number | null
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          change_type?: string | null
          company_id?: string
          created_at?: string
          effective_date?: string
          employee_id?: string
          id?: string
          new_salary?: number
          old_salary?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contract_legal_warnings: {
        Args: { p_employee_id: string }
        Returns: {
          message: string
          severity: string
        }[]
      }
      current_company_id: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      refresh_leave_accrual: {
        Args: { p_employee_id: string; p_year: number }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "employee"],
    },
  },
} as const
