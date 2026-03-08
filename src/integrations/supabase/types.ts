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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          id: string
          module: string
          record_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          module: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          module?: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ekv_records: {
        Row: {
          audit_date: string | null
          created_at: string
          error_message: string | null
          id: string
          kassen_ik: string | null
          kassenname: string | null
          kv_angelegt: string | null
          kv_entschieden: string | null
          kvnr_le: string | null
          kvnr_noventi: string | null
          le_ik: string | null
          le_kdnr: string | null
          notes: string | null
          payload: Json | null
          reasons: string | null
          status: string
          updated_at: string
          versicherten_nr: string | null
          versichertennachname: string | null
          versichertenvorname: string | null
        }
        Insert: {
          audit_date?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kassen_ik?: string | null
          kassenname?: string | null
          kv_angelegt?: string | null
          kv_entschieden?: string | null
          kvnr_le?: string | null
          kvnr_noventi?: string | null
          le_ik?: string | null
          le_kdnr?: string | null
          notes?: string | null
          payload?: Json | null
          reasons?: string | null
          status?: string
          updated_at?: string
          versicherten_nr?: string | null
          versichertennachname?: string | null
          versichertenvorname?: string | null
        }
        Update: {
          audit_date?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kassen_ik?: string | null
          kassenname?: string | null
          kv_angelegt?: string | null
          kv_entschieden?: string | null
          kvnr_le?: string | null
          kvnr_noventi?: string | null
          le_ik?: string | null
          le_kdnr?: string | null
          notes?: string | null
          payload?: Json | null
          reasons?: string | null
          status?: string
          updated_at?: string
          versicherten_nr?: string | null
          versichertennachname?: string | null
          versichertenvorname?: string | null
        }
        Relationships: []
      }
      letter_records: {
        Row: {
          ai_summary: string | null
          category: string | null
          created_at: string
          date_of_letter: string | null
          error_message: string | null
          id: string
          payload: Json | null
          pdf_url: string | null
          process_status: string | null
          recipient: string | null
          scan_status: string | null
          status: string
          type: string | null
          updated_at: string
          uploaded_at: string | null
          uploaded_by: string | null
          uploader_name: string | null
        }
        Insert: {
          ai_summary?: string | null
          category?: string | null
          created_at?: string
          date_of_letter?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          pdf_url?: string | null
          process_status?: string | null
          recipient?: string | null
          scan_status?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploader_name?: string | null
        }
        Update: {
          ai_summary?: string | null
          category?: string | null
          created_at?: string
          date_of_letter?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          pdf_url?: string | null
          process_status?: string | null
          recipient?: string | null
          scan_status?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploader_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          enabled: boolean | null
          id: string
          page_key: string
          role: string
        }
        Insert: {
          allowed?: boolean
          enabled?: boolean | null
          id?: string
          page_key: string
          role: string
        }
        Update: {
          allowed?: boolean
          enabled?: boolean | null
          id?: string
          page_key?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
