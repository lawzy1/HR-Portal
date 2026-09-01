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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          company_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          company_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          company_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          locale: string
          name: string
          registration_slug: string | null
          tax_code: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          locale?: string
          name: string
          registration_slug?: string | null
          tax_code?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          locale?: string
          name?: string
          registration_slug?: string | null
          tax_code?: string | null
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
          annual_leave_entitlement: number
          bhtn_employee_rate: number
          bhxh_employee_rate: number
          bhyt_employee_rate: number
          company_id: string
          dependent_deduction: number
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
          annual_leave_entitlement?: number
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id: string
          dependent_deduction?: number
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
          annual_leave_entitlement?: number
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id?: string
          dependent_deduction?: number
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
      company_workday_overrides: {
        Row: {
          company_id: string
          created_at: string
          id: string
          month: number
          standard_work_days: number
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          month: number
          standard_work_days: number
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          standard_work_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_workday_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          adjustment_categories: string[]
          allowance_amount: number
          approval_requested_at: string | null
          approval_requested_by: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate_per_view: number
          company_id: string
          contract_code: string
          created_at: string
          document_name: string | null
          document_path: string | null
          document_sha256: string | null
          employee_id: string
          end_date: string | null
          guaranteed_income: number
          id: string
          kpi_target_month: number | null
          level_title: string | null
          lunch_allowance: number
          note: string | null
          parent_contract_id: string | null
          phone_allowance: number
          position: string | null
          publish_status: string
          qc_commission_rate_per_view: number
          rejection_reason: string | null
          salary: number | null
          signed_date: string | null
          start_date: string
          status: string
          type: string
          work_location: string | null
          working_schedule: string | null
        }
        Insert: {
          adjustment_categories?: string[]
          allowance_amount?: number
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate_per_view?: number
          company_id: string
          contract_code: string
          created_at?: string
          document_name?: string | null
          document_path?: string | null
          document_sha256?: string | null
          employee_id: string
          end_date?: string | null
          guaranteed_income?: number
          id?: string
          kpi_target_month?: number | null
          level_title?: string | null
          lunch_allowance?: number
          note?: string | null
          parent_contract_id?: string | null
          phone_allowance?: number
          position?: string | null
          publish_status?: string
          qc_commission_rate_per_view?: number
          rejection_reason?: string | null
          salary?: number | null
          signed_date?: string | null
          start_date: string
          status?: string
          type: string
          work_location?: string | null
          working_schedule?: string | null
        }
        Update: {
          adjustment_categories?: string[]
          allowance_amount?: number
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate_per_view?: number
          company_id?: string
          contract_code?: string
          created_at?: string
          document_name?: string | null
          document_path?: string | null
          document_sha256?: string | null
          employee_id?: string
          end_date?: string | null
          guaranteed_income?: number
          id?: string
          kpi_target_month?: number | null
          level_title?: string | null
          lunch_allowance?: number
          note?: string | null
          parent_contract_id?: string | null
          phone_allowance?: number
          position?: string | null
          publish_status?: string
          qc_commission_rate_per_view?: number
          rejection_reason?: string | null
          salary?: number | null
          signed_date?: string | null
          start_date?: string
          status?: string
          type?: string
          work_location?: string | null
          working_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_approval_requested_by_fkey"
            columns: ["approval_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string
          company_id: string
          completed_at: string | null
          email: string
          employee_id: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          last_email_error: string | null
          last_opened_at: string | null
          last_sent_at: string
          resend_count: number
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id: string
          company_id: string
          completed_at?: string | null
          email: string
          employee_id: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          last_email_error?: string | null
          last_opened_at?: string | null
          last_sent_at?: string
          resend_count?: number
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string
          company_id?: string
          completed_at?: string | null
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          last_email_error?: string | null
          last_opened_at?: string | null
          last_sent_at?: string
          resend_count?: number
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profile_change_requests: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          message: string
          notification_error: string | null
          notification_sent_at: string | null
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          message: string
          notification_error?: string | null
          notification_sent_at?: string | null
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          message?: string
          notification_error?: string | null
          notification_sent_at?: string | null
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profile_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "employee_sensitive_info_identity_verified_by_fkey"
            columns: ["identity_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          guaranteed_income_amount: number
          id: string
          job_title: string | null
          kpi_level: string | null
          kpi_target_per_day: number | null
          last_salary_review_date: string | null
          leave_accrual_mode: string
          marital_status: string | null
          performance_commission_rate: number
          permanent_address: string | null
          phone: string | null
          qc_commission_rate: number
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
          guaranteed_income_amount?: number
          id?: string
          job_title?: string | null
          kpi_level?: string | null
          kpi_target_per_day?: number | null
          last_salary_review_date?: string | null
          leave_accrual_mode?: string
          marital_status?: string | null
          performance_commission_rate?: number
          permanent_address?: string | null
          phone?: string | null
          qc_commission_rate?: number
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
          guaranteed_income_amount?: number
          id?: string
          job_title?: string | null
          kpi_level?: string | null
          kpi_target_per_day?: number | null
          last_salary_review_date?: string | null
          leave_accrual_mode?: string
          marital_status?: string | null
          performance_commission_rate?: number
          permanent_address?: string | null
          phone?: string | null
          qc_commission_rate?: number
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
          category: string
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
          category?: string
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
          category?: string
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
          approval_requested_at: string | null
          approval_requested_by: string | null
          approved_at: string | null
          approved_by: string | null
          benefit_amount: number | null
          bonus_amount: number | null
          commission_rate_snapshot: number
          company_id: string
          completion_percentage: number | null
          created_at: string
          employee_id: string
          guaranteed_income_topup: number
          id: string
          kpi_converted_views: number | null
          kpi_target: number | null
          month: number
          notes: string | null
          ot_hourly_rate: number | null
          ot_hours: number | null
          performance_commission_amount: number
          publish_status: string
          qc_commission_amount: number
          qc_rate_snapshot: number
          qc_views: number
          rejection_reason: string | null
          rendered_views_actual: number | null
          year: number
        }
        Insert: {
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          benefit_amount?: number | null
          bonus_amount?: number | null
          commission_rate_snapshot?: number
          company_id: string
          completion_percentage?: number | null
          created_at?: string
          employee_id: string
          guaranteed_income_topup?: number
          id?: string
          kpi_converted_views?: number | null
          kpi_target?: number | null
          month: number
          notes?: string | null
          ot_hourly_rate?: number | null
          ot_hours?: number | null
          performance_commission_amount?: number
          publish_status?: string
          qc_commission_amount?: number
          qc_rate_snapshot?: number
          qc_views?: number
          rejection_reason?: string | null
          rendered_views_actual?: number | null
          year: number
        }
        Update: {
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          benefit_amount?: number | null
          bonus_amount?: number | null
          commission_rate_snapshot?: number
          company_id?: string
          completion_percentage?: number | null
          created_at?: string
          employee_id?: string
          guaranteed_income_topup?: number
          id?: string
          kpi_converted_views?: number | null
          kpi_target?: number | null
          month?: number
          notes?: string | null
          ot_hourly_rate?: number | null
          ot_hours?: number | null
          performance_commission_amount?: number
          publish_status?: string
          qc_commission_amount?: number
          qc_rate_snapshot?: number
          qc_views?: number
          rejection_reason?: string | null
          rendered_views_actual?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_monthly_approval_requested_by_fkey"
            columns: ["approval_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_monthly_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "leave_balance_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notification_outbox: {
        Row: {
          attempts: number
          available_at: string
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_employee_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_employee_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_employee_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
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
          annual_leave_remaining_days: number
          annual_leave_used_days: number
          approval_requested_at: string | null
          approval_requested_by: string | null
          approved_at: string | null
          approved_by: string | null
          base_salary: number
          bhtn_deduction: number
          bhxh_deduction: number
          bhyt_deduction: number
          business_trip_refund: number
          company_id: string
          created_at: string
          dependents_count: number
          employee_id: string
          family_deduction: number
          gross_income: number
          holiday_bonus_amount: number
          id: string
          import_source_name: string | null
          kpi_bonus: number
          lunch_allowance: number
          month: number
          net_salary: number
          note: string | null
          notification_sent_at: string | null
          notification_status: string
          ot_hours: number
          ot_pay: number
          other_deductions: number
          payment_date: string | null
          payment_status: string
          payslip_pdf_path: string | null
          payslip_pdf_sha256: string | null
          personal_income_tax: number
          personal_income_tax_refund: number
          phone_allowance: number
          prior_month_adjustment: number
          project_bonus_amount: number
          publish_status: string
          published_at: string | null
          published_by: string | null
          rejection_reason: string | null
          standard_work_days: number
          tax_exempt_income: number
          taxable_income: number
          total_adjustments: number | null
          total_deductions: number | null
          welfare_refund: number
          workday_salary: number
          year: number
        }
        Insert: {
          actual_work_days?: number
          advance_payment?: number
          annual_leave_remaining_days?: number
          annual_leave_used_days?: number
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          bhtn_deduction?: number
          bhxh_deduction?: number
          bhyt_deduction?: number
          business_trip_refund?: number
          company_id: string
          created_at?: string
          dependents_count?: number
          employee_id: string
          family_deduction?: number
          gross_income?: number
          holiday_bonus_amount?: number
          id?: string
          import_source_name?: string | null
          kpi_bonus?: number
          lunch_allowance?: number
          month: number
          net_salary?: number
          note?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          ot_hours?: number
          ot_pay?: number
          other_deductions?: number
          payment_date?: string | null
          payment_status?: string
          payslip_pdf_path?: string | null
          payslip_pdf_sha256?: string | null
          personal_income_tax?: number
          personal_income_tax_refund?: number
          phone_allowance?: number
          prior_month_adjustment?: number
          project_bonus_amount?: number
          publish_status?: string
          published_at?: string | null
          published_by?: string | null
          rejection_reason?: string | null
          standard_work_days?: number
          tax_exempt_income?: number
          taxable_income?: number
          total_adjustments?: number | null
          total_deductions?: number | null
          welfare_refund?: number
          workday_salary?: number
          year: number
        }
        Update: {
          actual_work_days?: number
          advance_payment?: number
          annual_leave_remaining_days?: number
          annual_leave_used_days?: number
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          bhtn_deduction?: number
          bhxh_deduction?: number
          bhyt_deduction?: number
          business_trip_refund?: number
          company_id?: string
          created_at?: string
          dependents_count?: number
          employee_id?: string
          family_deduction?: number
          gross_income?: number
          holiday_bonus_amount?: number
          id?: string
          import_source_name?: string | null
          kpi_bonus?: number
          lunch_allowance?: number
          month?: number
          net_salary?: number
          note?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          ot_hours?: number
          ot_pay?: number
          other_deductions?: number
          payment_date?: string | null
          payment_status?: string
          payslip_pdf_path?: string | null
          payslip_pdf_sha256?: string | null
          personal_income_tax?: number
          personal_income_tax_refund?: number
          phone_allowance?: number
          prior_month_adjustment?: number
          project_bonus_amount?: number
          publish_status?: string
          published_at?: string | null
          published_by?: string | null
          rejection_reason?: string | null
          standard_work_days?: number
          tax_exempt_income?: number
          taxable_income?: number
          total_adjustments?: number | null
          total_deductions?: number | null
          welfare_refund?: number
          workday_salary?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_approval_requested_by_fkey"
            columns: ["approval_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "payroll_records_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          onboarding_note: string | null
          onboarding_reviewed_at: string | null
          onboarding_reviewed_by: string | null
          onboarding_status: string
          onboarding_submitted_at: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id?: string | null
          id: string
          is_active?: boolean
          onboarding_note?: string | null
          onboarding_reviewed_at?: string | null
          onboarding_reviewed_by?: string | null
          onboarding_status?: string
          onboarding_submitted_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          onboarding_note?: string | null
          onboarding_reviewed_at?: string | null
          onboarding_reviewed_by?: string | null
          onboarding_status?: string
          onboarding_submitted_at?: string | null
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
          {
            foreignKeyName: "profiles_onboarding_reviewed_by_fkey"
            columns: ["onboarding_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "work_events_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_own_backoffice_account: { Args: never; Returns: undefined }
      approve_contract: { Args: { p_contract_id: string }; Returns: string }
      approve_kpi_month: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
      approve_payroll_month: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
      contract_legal_warnings: {
        Args: { p_employee_id: string }
        Returns: {
          message: string
          severity: string
        }[]
      }
      create_employee_invitation: {
        Args: {
          p_actor_id: string
          p_auth_user_id: string
          p_department: string
          p_email: string
          p_employee_code: string
          p_full_name: string
          p_job_title: string
          p_start_date: string
        }
        Returns: {
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
          guaranteed_income_amount: number
          id: string
          job_title: string | null
          kpi_level: string | null
          kpi_target_per_day: number | null
          last_salary_review_date: string | null
          leave_accrual_mode: string
          marital_status: string | null
          performance_commission_rate: number
          permanent_address: string | null
          phone: string | null
          qc_commission_rate: number
          start_date: string | null
          status: string
          temporary_address: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "employees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_company_id: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      current_onboarding_employee_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_backoffice: { Args: never; Returns: boolean }
      is_employee: { Args: never; Returns: boolean }
      is_hr_accounting: { Args: never; Returns: boolean }
      mark_own_invitation_completed: { Args: never; Returns: undefined }
      mark_own_invitation_opened: { Args: never; Returns: undefined }
      record_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: undefined
      }
      refresh_leave_accrual: {
        Args: { p_employee_id: string; p_year: number }
        Returns: undefined
      }
      reject_contract: {
        Args: { p_contract_id: string; p_reason: string }
        Returns: string
      }
      reject_kpi_month: {
        Args: { p_month: number; p_reason: string; p_year: number }
        Returns: number
      }
      reject_payroll_month: {
        Args: { p_month: number; p_reason: string; p_year: number }
        Returns: number
      }
      retry_payslip_notification: {
        Args: { p_payroll_id: string }
        Returns: string
      }
      review_employee_onboarding: {
        Args: { p_decision: string; p_note?: string; p_profile_id: string }
        Returns: undefined
      }
      save_and_submit_own_onboarding: {
        Args: { p_employee: Json; p_relatives: Json; p_sensitive: Json }
        Returns: undefined
      }
      start_own_onboarding: { Args: never; Returns: undefined }
      submit_contract: { Args: { p_contract_id: string }; Returns: string }
      submit_kpi_month: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
      submit_own_onboarding: { Args: never; Returns: undefined }
      submit_payroll_month: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
    }
    Enums: {
      user_role: "admin" | "employee" | "hr"
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
      user_role: ["admin", "employee", "hr"],
    },
  },
} as const
