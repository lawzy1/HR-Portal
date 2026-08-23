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
      company_settings: {
        Row: {
          bhtn_employee_rate: number
          bhxh_employee_rate: number
          bhyt_employee_rate: number
          company_id: string
          id: string
          kpi_bonus_min: number
          kpi_bonus_per_point: number
          kpi_rate_per_day: number
          ot_weekday_percent: number
          ot_weekend_percent: number
          session_timeout_minutes: number
          standard_work_days: number
          updated_at: string
        }
        Insert: {
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id: string
          id?: string
          kpi_bonus_min?: number
          kpi_bonus_per_point?: number
          kpi_rate_per_day?: number
          ot_weekday_percent?: number
          ot_weekend_percent?: number
          session_timeout_minutes?: number
          standard_work_days?: number
          updated_at?: string
        }
        Update: {
          bhtn_employee_rate?: number
          bhxh_employee_rate?: number
          bhyt_employee_rate?: number
          company_id?: string
          id?: string
          kpi_bonus_min?: number
          kpi_bonus_per_point?: number
          kpi_rate_per_day?: number
          ot_weekday_percent?: number
          ot_weekend_percent?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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
