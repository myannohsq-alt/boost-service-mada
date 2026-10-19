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
      api_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number
          error: string
          id: string
          ok: boolean
          order_id: string | null
          provider: string
          request: Json
          response: Json
          status_code: number | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number
          error?: string
          id?: string
          ok?: boolean
          order_id?: string | null
          provider?: string
          request?: Json
          response?: Json
          status_code?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number
          error?: string
          id?: string
          ok?: boolean
          order_id?: string | null
          provider?: string
          request?: Json
          response?: Json
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      boost_orders: {
        Row: {
          client_name: string
          created_at: string
          done_count: number
          id: string
          link: string
          phone: string
          price: number
          quantity: number
          service_type: string
          status: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          done_count?: number
          id?: string
          link: string
          phone: string
          price?: number
          quantity: number
          service_type: string
          status?: string
          user_id?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          done_count?: number
          id?: string
          link?: string
          phone?: string
          price?: number
          quantity?: number
          service_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      booster_accounts: {
        Row: {
          created_at: string
          fb_link: string
          fb_name: string
          id: string
          mvola: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fb_link: string
          fb_name: string
          id?: string
          mvola: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          fb_link?: string
          fb_name?: string
          id?: string
          mvola?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      booster_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          mvola: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mvola: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mvola?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_name: string
          content: string
          created_at: string
          duration: number | null
          id: string
          media_path: string | null
          type: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          duration?: number | null
          id?: string
          media_path?: string | null
          type?: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          duration?: number | null
          id?: string
          media_path?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          created_at: string
          id: string
          locked: boolean
          pinned: boolean
          user_id: string
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          user_id: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          user_id?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_claims: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          proof_path: string | null
          reward: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          proof_path?: string | null
          reward: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          proof_path?: string | null
          reward?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_claims_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          id: string
          kind: string
          link: string
          order_id: string
          reward: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          link: string
          order_id: string
          reward: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          link?: string
          order_id?: string
          reward?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "boost_orders"
            referencedColumns: ["id"]
          },
        ]
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
          api_error: string
          comments: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_synced_at: string | null
          next_retry_at: string | null
          notes: string
          provider_charge: number | null
          provider_error: string
          provider_order_id: string | null
          provider_response: Json
          provider_status: string
          quantity: number
          remains: number | null
          retry_count: number
          sent_at: string | null
          service_id: string | null
          service_label: string
          start_count: number | null
          status: string
          target_link: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          api_error?: string
          comments?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_synced_at?: string | null
          next_retry_at?: string | null
          notes?: string
          provider_charge?: number | null
          provider_error?: string
          provider_order_id?: string | null
          provider_response?: Json
          provider_status?: string
          quantity: number
          remains?: number | null
          retry_count?: number
          sent_at?: string | null
          service_id?: string | null
          service_label?: string
          start_count?: number | null
          status?: string
          target_link: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          api_error?: string
          comments?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_synced_at?: string | null
          next_retry_at?: string | null
          notes?: string
          provider_charge?: number | null
          provider_error?: string
          provider_order_id?: string | null
          provider_response?: Json
          provider_status?: string
          quantity?: number
          remains?: number | null
          retry_count?: number
          sent_at?: string | null
          service_id?: string | null
          service_label?: string
          start_count?: number | null
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
          avatar_url: string
          balance: number
          created_at: string
          email: string
          id: string
          last_spin_date: string | null
          name: string
          phone: string
          points: number
          referral_code: string
          referral_earnings: number
          referred_by: string | null
          tours_restants: number
        }
        Insert: {
          avatar_url?: string
          balance?: number
          created_at?: string
          email?: string
          id: string
          last_spin_date?: string | null
          name?: string
          phone?: string
          points?: number
          referral_code: string
          referral_earnings?: number
          referred_by?: string | null
          tours_restants?: number
        }
        Update: {
          avatar_url?: string
          balance?: number
          created_at?: string
          email?: string
          id?: string
          last_spin_date?: string | null
          name?: string
          phone?: string
          points?: number
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          tours_restants?: number
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
      provider_services: {
        Row: {
          category: string
          created_at: string
          id: string
          max_qty: number
          min_qty: number
          name: string
          provider_service_id: string
          rate_usd: number
          raw: Json
          selected: boolean
          synced_at: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          max_qty?: number
          min_qty?: number
          name?: string
          provider_service_id: string
          rate_usd?: number
          raw?: Json
          selected?: boolean
          synced_at?: string
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          max_qty?: number
          min_qty?: number
          name?: string
          provider_service_id?: string
          rate_usd?: number
          raw?: Json
          selected?: boolean
          synced_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_settings: {
        Row: {
          api_key: string
          api_url: string
          ar_per_usd: number
          auto_fulfill: boolean
          balance_cached_at: string | null
          balance_currency: string
          balance_error: string
          balance_value: string
          created_at: string
          cron_secret: string
          id: string
          markup_percent: number
          pause_reason: string
          paused: boolean
          rate_limit_hits: number
          rate_limited_until: string | null
          services_synced_at: string | null
          singleton: boolean
          sync_url: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_url?: string
          ar_per_usd?: number
          auto_fulfill?: boolean
          balance_cached_at?: string | null
          balance_currency?: string
          balance_error?: string
          balance_value?: string
          created_at?: string
          cron_secret?: string
          id?: string
          markup_percent?: number
          pause_reason?: string
          paused?: boolean
          rate_limit_hits?: number
          rate_limited_until?: string | null
          services_synced_at?: string | null
          singleton?: boolean
          sync_url?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          ar_per_usd?: number
          auto_fulfill?: boolean
          balance_cached_at?: string | null
          balance_currency?: string
          balance_error?: string
          balance_value?: string
          created_at?: string
          cron_secret?: string
          id?: string
          markup_percent?: number
          pause_reason?: string
          paused?: boolean
          rate_limit_hits?: number
          rate_limited_until?: string | null
          services_synced_at?: string | null
          singleton?: boolean
          sync_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      recharges: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          reference: string
          sender_phone: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          reference: string
          sender_phone: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
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
      saturday_winners: {
        Row: {
          author_name: string
          created_at: string
          gain: number
          id: string
          points: number
          user_id: string
          week_date: string
        }
        Insert: {
          author_name?: string
          created_at?: string
          gain?: number
          id?: string
          points?: number
          user_id: string
          week_date: string
        }
        Update: {
          author_name?: string
          created_at?: string
          gain?: number
          id?: string
          points?: number
          user_id?: string
          week_date?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          badge: string
          category: string
          created_at: string
          delivery_time: string
          id: string
          name_fr: string
          name_mg: string
          note: string | null
          platform: string
          price: number
          provider_max: number | null
          provider_min: number | null
          provider_name: string
          provider_rate_usd: number | null
          provider_service_id: string | null
          sort_order: number
          unit: number
        }
        Insert: {
          active?: boolean
          badge?: string
          category?: string
          created_at?: string
          delivery_time?: string
          id?: string
          name_fr: string
          name_mg: string
          note?: string | null
          platform: string
          price: number
          provider_max?: number | null
          provider_min?: number | null
          provider_name?: string
          provider_rate_usd?: number | null
          provider_service_id?: string | null
          sort_order?: number
          unit?: number
        }
        Update: {
          active?: boolean
          badge?: string
          category?: string
          created_at?: string
          delivery_time?: string
          id?: string
          name_fr?: string
          name_mg?: string
          note?: string | null
          platform?: string
          price?: number
          provider_max?: number | null
          provider_min?: number | null
          provider_name?: string
          provider_rate_usd?: number | null
          provider_service_id?: string | null
          sort_order?: number
          unit?: number
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          last_error: string
          payload: Json
          processed_at: string | null
          run_after: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          last_error?: string
          payload?: Json
          processed_at?: string | null
          run_after?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          last_error?: string
          payload?: Json
          processed_at?: string | null
          run_after?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_locks: {
        Row: {
          locked_until: string
          name: string
          updated_at: string
        }
        Insert: {
          locked_until: string
          name: string
          updated_at?: string
        }
        Update: {
          locked_until?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          created_at: string
          detail: string
          error: string
          finished_at: string | null
          id: string
          items_failed: number
          items_processed: number
          kind: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string
          error?: string
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          kind: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          detail?: string
          error?: string
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          kind?: string
          started_at?: string
          status?: string
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
      wheel_history: {
        Row: {
          author_name: string
          avatar_url: string
          created_at: string
          id: string
          type: string
          user_id: string
          valeur: number
        }
        Insert: {
          author_name?: string
          avatar_url?: string
          created_at?: string
          id?: string
          type: string
          user_id: string
          valeur: number
        }
        Update: {
          author_name?: string
          avatar_url?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string
          valeur?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_sync_lock: {
        Args: { _name: string; _seconds: number }
        Returns: boolean
      }
      approve_boost_order: { Args: { _id: string }; Returns: undefined }
      approve_recharge: { Args: { _recharge_id: string }; Returns: undefined }
      available_missions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          kind: string
          link: string
          open_count: number
          order_id: string
          reward: number
        }[]
      }
      booster_wallet: { Args: never; Returns: Json }
      cancel_boost_order: { Args: { _id: string }; Returns: undefined }
      claim_mission: {
        Args: { _mission_id: string; _proof_path: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invited_count: { Args: never; Returns: number }
      leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          id: string
          name: string
          points: number
        }[]
      }
      mark_boost_paid: { Args: { _id: string }; Returns: undefined }
      order_proofs: {
        Args: { _order_id: string }
        Returns: {
          created_at: string
          fb_name: string
          id: string
          proof_path: string
          status: string
        }[]
      }
      place_boost_order: {
        Args: {
          _link: string
          _name: string
          _phone: string
          _qty: number
          _types: string[]
        }
        Returns: number
      }
      place_comment_order: {
        Args: { _comments: string; _link: string }
        Returns: string
      }
      place_order: {
        Args: {
          _link: string
          _note?: string
          _promo: string
          _quantity: number
          _service_id: string
        }
        Returns: string
      }
      public_stats: { Args: never; Returns: Json }
      recent_saturday_winners: {
        Args: { _limit?: number }
        Returns: {
          author_name: string
          gain: number
          id: string
          points: number
          week_date: string
        }[]
      }
      recent_wheel_wins: {
        Args: { _limit?: number; _since: string }
        Returns: {
          author_name: string
          avatar_url: string
          created_at: string
          id: string
          type: string
          valeur: number
        }[]
      }
      reject_recharge: {
        Args: { _reason?: string; _recharge_id: string }
        Returns: undefined
      }
      release_sync_lock: { Args: { _name: string }; Returns: undefined }
      request_booster_withdrawal: {
        Args: { _amount: number }
        Returns: undefined
      }
      review_booster_withdrawal: {
        Args: { _approve: boolean; _id: string }
        Returns: undefined
      }
      review_mission_claim: {
        Args: { _approve: boolean; _claim_id: string }
        Returns: undefined
      }
      send_chat_message: {
        Args: {
          _content: string
          _duration?: number
          _media_path?: string
          _type?: string
        }
        Returns: string
      }
      set_display_name: { Args: { _name: string }; Returns: string }
      spin_wheel: { Args: never; Returns: Json }
      trigger_smmgen_sync: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
