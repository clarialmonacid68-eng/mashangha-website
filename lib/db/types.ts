export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          delivery_url: string | null
          developer_id: string
          id: string
          is_current: boolean
          notes: string
          order_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          delivery_url?: string | null
          developer_id: string
          id?: string
          is_current?: boolean
          notes: string
          order_id: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          delivery_url?: string | null
          developer_id?: string
          id?: string
          is_current?: boolean
          notes?: string
          order_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_developer_id_fkey"
            columns: ["developer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          demand_id: string
          file_name: string
          id: string
          owner_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          demand_id: string
          file_name: string
          id?: string
          owner_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          demand_id?: string
          file_name?: string
          id?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_attachments_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_attachments_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          budget_max_cents: number
          budget_min_cents: number
          closed_at: string | null
          cooperation_mode: string
          created_at: string
          customer_id: string
          description: string
          expected_delivery_date: string | null
          expected_delivery_days: number | null
          id: string
          matched_at: string | null
          project_type: string
          published_at: string | null
          review_notes: string | null
          status: Database["public"]["Enums"]["demand_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget_max_cents: number
          budget_min_cents: number
          closed_at?: string | null
          cooperation_mode?: string
          created_at?: string
          customer_id: string
          description: string
          expected_delivery_date?: string | null
          expected_delivery_days?: number | null
          id?: string
          matched_at?: string | null
          project_type?: string
          published_at?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget_max_cents?: number
          budget_min_cents?: number
          closed_at?: string | null
          cooperation_mode?: string
          created_at?: string
          customer_id?: string
          description?: string
          expected_delivery_date?: string | null
          expected_delivery_days?: number | null
          id?: string
          matched_at?: string | null
          project_type?: string
          published_at?: string | null
          review_notes?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_profiles: {
        Row: {
          bio: string | null
          city: string | null
          contact: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          hourly_rate_cents: number | null
          payout_subject_name: string | null
          payout_subject_type: string | null
          portfolio_description: string | null
          portfolio_image_url: string | null
          portfolio_title: string | null
          portfolio_url: string | null
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          service_scopes: string[]
          skills: string[]
          starting_price_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          hourly_rate_cents?: number | null
          payout_subject_name?: string | null
          payout_subject_type?: string | null
          portfolio_description?: string | null
          portfolio_image_url?: string | null
          portfolio_title?: string | null
          portfolio_url?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          service_scopes?: string[]
          skills?: string[]
          starting_price_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          hourly_rate_cents?: number | null
          payout_subject_name?: string | null
          payout_subject_type?: string | null
          portfolio_description?: string | null
          portfolio_image_url?: string | null
          portfolio_title?: string | null
          portfolio_url?: string | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          service_scopes?: string[]
          skills?: string[]
          starting_price_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string
          description: string | null
          dispute_id: string
          id: string
          storage_path: string
          submitted_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispute_id: string
          id?: string
          storage_path: string
          submitted_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dispute_id?: string
          id?: string
          storage_path?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          requested_resolution: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          reason: string
          requested_resolution: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          requested_resolution?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          message_id: string | null
          order_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          message_id?: string | null
          order_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string | null
          order_id?: string
          size_bytes?: number
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "order_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          order_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey"
            columns: ["actor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          amount_cents: number
          commission_bps: number
          completed_at: string | null
          created_at: string
          customer_id: string
          demand_id: string
          developer_id: string
          id: string
          paid_at: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          amount_cents: number
          commission_bps: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          demand_id: string
          developer_id: string
          id?: string
          paid_at?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          amount_cents?: number
          commission_bps?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          demand_id?: string
          developer_id?: string
          id?: string
          paid_at?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_developer_id_fkey"
            columns: ["developer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          closed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          order_id: string
          paid_at: string | null
          platform_payment_no: string
          provider: string
          provider_transaction_id: string | null
          raw_status: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          closed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id: string
          paid_at?: string | null
          platform_payment_no: string
          provider: string
          provider_transaction_id?: string | null
          raw_status?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          closed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string
          paid_at?: string | null
          platform_payment_no?: string
          provider?: string
          provider_transaction_id?: string | null
          raw_status?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profit_shares: {
        Row: {
          commission_amount_cents: number
          created_at: string
          developer_amount_cents: number
          id: string
          order_id: string
          payment_id: string
          platform_share_no: string
          status: Database["public"]["Enums"]["share_status"]
          updated_at: string
        }
        Insert: {
          commission_amount_cents: number
          created_at?: string
          developer_amount_cents: number
          id?: string
          order_id: string
          payment_id: string
          platform_share_no: string
          status?: Database["public"]["Enums"]["share_status"]
          updated_at?: string
        }
        Update: {
          commission_amount_cents?: number
          created_at?: string
          developer_amount_cents?: number
          id?: string
          order_id?: string
          payment_id?: string
          platform_share_no?: string
          status?: Database["public"]["Enums"]["share_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_shares_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_shares_payment_id_fkey"
            columns: ["payment_id"]
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount_cents: number
          created_at: string
          delivery_days: number
          demand_id: string
          developer_id: string
          expires_at: string | null
          id: string
          proposal: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          delivery_days: number
          demand_id: string
          developer_id: string
          expires_at?: string | null
          id?: string
          proposal: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          delivery_days?: number
          demand_id?: string
          developer_id?: string
          expires_at?: string | null
          id?: string
          proposal?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_developer_id_fkey"
            columns: ["developer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          order_id: string
          payment_id: string
          platform_refund_no: string
          provider_refund_id: string | null
          reason: string
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          order_id: string
          payment_id: string
          platform_refund_no: string
          provider_refund_id?: string | null
          reason: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_id?: string
          platform_refund_no?: string
          provider_refund_id?: string | null
          reason?: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          is_public: boolean
          order_id: string
          rating: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          order_id: string
          rating: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          order_id?: string
          rating?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_orders: {
        Row: {
          child_order_id: string
          created_at: string
          id: string
          parent_order_id: string
        }
        Insert: {
          child_order_id: string
          created_at?: string
          id?: string
          parent_order_id: string
        }
        Update: {
          child_order_id?: string
          created_at?: string
          id?: string
          parent_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_orders_child_order_id_fkey"
            columns: ["child_order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_order_delivery: {
        Args: { target_order_id: string }
        Returns: {
          accepted_at: string | null
          amount_cents: number
          commission_bps: number
          completed_at: string | null
          created_at: string
          customer_id: string
          demand_id: string
          developer_id: string
          id: string
          paid_at: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_for_developer: { Args: never; Returns: undefined }
      close_demand: {
        Args: { demand_id: string }
        Returns: {
          budget_max_cents: number
          budget_min_cents: number
          closed_at: string | null
          cooperation_mode: string
          created_at: string
          customer_id: string
          description: string
          expected_delivery_date: string | null
          expected_delivery_days: number | null
          id: string
          matched_at: string | null
          project_type: string
          published_at: string | null
          review_notes: string | null
          status: Database["public"]["Enums"]["demand_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "demands"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_mock_payment: {
        Args: { provider_payment_id: string }
        Returns: {
          payment: Database["public"]["Tables"]["payments"]["Row"]
          target_order: Database["public"]["Tables"]["orders"]["Row"]
        }[]
      }
      confirm_mock_payment: {
        Args: { provider_payment_id: string }
        Returns: {
          payment: Database["public"]["Tables"]["payments"]["Row"]
          target_order: Database["public"]["Tables"]["orders"]["Row"]
        }[]
      }
      create_mock_payment: {
        Args: {
          payment_idempotency_key: string
          provider_payment_id: string
          target_order_id: string
        }
        Returns: {
          amount_cents: number
          closed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          order_id: string
          paid_at: string | null
          platform_payment_no: string
          provider: string
          provider_transaction_id: string | null
          raw_status: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order_review: {
        Args: {
          public_review?: boolean
          rating_value: number
          review_body?: string
          target_order_id: string
        }
        Returns: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          is_public: boolean
          order_id: string
          rating: number
          subject_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      open_order_dispute: {
        Args: {
          dispute_reason: string
          requested_dispute_resolution: string
          target_order_id: string
        }
        Returns: {
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          requested_resolution: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "disputes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_order_delivery: {
        Args: { rejection_reason: string; target_order_id: string }
        Returns: {
          accepted_at: string | null
          amount_cents: number
          commission_bps: number
          completed_at: string | null
          created_at: string
          customer_id: string
          demand_id: string
          developer_id: string
          id: string
          paid_at: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_quote_for_order: {
        Args: { quote_id: string }
        Returns: {
          accepted_at: string | null
          amount_cents: number
          commission_bps: number
          completed_at: string | null
          created_at: string
          customer_id: string
          demand_id: string
          developer_id: string
          id: string
          paid_at: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_order_delivery: {
        Args: {
          delivery_notes: string
          delivery_url?: string
          target_order_id: string
        }
        Returns: {
          created_at: string
          delivery_url: string | null
          developer_id: string
          id: string
          is_current: boolean
          notes: string
          order_id: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "customer" | "developer" | "admin"
      demand_status:
        | "draft"
        | "pending_review"
        | "published"
        | "matched"
        | "closed"
      dispute_status:
        | "open"
        | "investigating"
        | "resolved_continue"
        | "resolved_accept"
        | "resolved_refund"
        | "closed"
      order_status:
        | "pending_payment"
        | "in_progress"
        | "delivered"
        | "accepted"
        | "sharing"
        | "completed"
        | "closed"
        | "refund_review"
        | "refunding"
        | "refunded"
        | "disputed"
        | "share_failed"
      payment_status: "created" | "pending" | "succeeded" | "closed" | "failed"
      quote_status: "active" | "selected" | "withdrawn" | "expired" | "rejected"
      refund_status:
        | "requested"
        | "approved"
        | "processing"
        | "succeeded"
        | "failed"
        | "rejected"
      review_status: "draft" | "pending" | "approved" | "rejected"
      share_status: "pending" | "processing" | "succeeded" | "failed"
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
      app_role: ["customer", "developer", "admin"],
      demand_status: [
        "draft",
        "pending_review",
        "published",
        "matched",
        "closed",
      ],
      dispute_status: [
        "open",
        "investigating",
        "resolved_continue",
        "resolved_accept",
        "resolved_refund",
        "closed",
      ],
      order_status: [
        "pending_payment",
        "in_progress",
        "delivered",
        "accepted",
        "sharing",
        "completed",
        "closed",
        "refund_review",
        "refunding",
        "refunded",
        "disputed",
        "share_failed",
      ],
      payment_status: ["created", "pending", "succeeded", "closed", "failed"],
      quote_status: ["active", "selected", "withdrawn", "expired", "rejected"],
      refund_status: [
        "requested",
        "approved",
        "processing",
        "succeeded",
        "failed",
        "rejected",
      ],
      review_status: ["draft", "pending", "approved", "rejected"],
      share_status: ["pending", "processing", "succeeded", "failed"],
    },
  },
} as const
