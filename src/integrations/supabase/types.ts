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
      activity_log: {
        Row: {
          action: string
          created_at: string
          detail: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          quantity: number
          service_id: string | null
          service_label: string
          status: string
          target_link: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          quantity: number
          service_id?: string | null
          service_label?: string
          status?: string
          target_link: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          quantity?: number
          service_id?: string | null
          service_label?: string
          status?: string
          target_link?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          phone: string
          referral_code: string
          referral_earnings: number
          referred_by: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          id: string
          name?: string
          phone?: string
          referral_code: string
          referral_earnings?: number
          referred_by?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          phone?: string
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          uses?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          description: string
          discount: number
          ends_at: string | null
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          discount?: number
          ends_at?: string | null
          id?: string
          starts_at?: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          discount?: number
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      protection_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      recharges: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference: string
          sender_phone: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference: string
          sender_phone: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference?: string
          sender_phone?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          author_name: string
          comment: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          approved?: boolean
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          user_id: string
        }
        Update: {
          approved?: boolean
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          name_fr: string
          name_mg: string
          note: string | null
          platform: string
          price: number
          sort_order: number
          unit: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name_fr: string
          name_mg: string
          note?: string | null
          platform: string
          price: number
          sort_order?: number
          unit?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name_fr?: string
          name_mg?: string
          note?: string | null
          platform?: string
          price?: number
          sort_order?: number
          unit?: number
        }
        Relationships: []
      }
      tutorials: {
        Row: {
          created_at: string
          description: string
          id: string
          is_premium: boolean
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_premium?: boolean
          title: string
          video_url?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_premium?: boolean
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_recharge: { Args: { _recharge_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _link: string
          _promo: string
          _quantity: number
          _service_id: string
        }
        Returns: string
      }
      public_stats: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
