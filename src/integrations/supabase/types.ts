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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arbitrage_opportunities: {
        Row: {
          amount_in: number
          confidence: number
          created_at: string
          executed_at: string | null
          gas_estimate: string
          id: string
          net_profit: number
          profit_percent: number
          profit_usd: number
          route: string[]
          source_dex: string
          source_network: Database["public"]["Enums"]["network_type"]
          status: Database["public"]["Enums"]["opportunity_status"]
          target_dex: string
          target_network: Database["public"]["Enums"]["network_type"] | null
          token_in: string
          token_out: string
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_in: number
          confidence: number
          created_at?: string
          executed_at?: string | null
          gas_estimate: string
          id?: string
          net_profit: number
          profit_percent: number
          profit_usd: number
          route: string[]
          source_dex: string
          source_network: Database["public"]["Enums"]["network_type"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          target_dex: string
          target_network?: Database["public"]["Enums"]["network_type"] | null
          token_in: string
          token_out: string
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_in?: number
          confidence?: number
          created_at?: string
          executed_at?: string | null
          gas_estimate?: string
          id?: string
          net_profit?: number
          profit_percent?: number
          profit_usd?: number
          route?: string[]
          source_dex?: string
          source_network?: Database["public"]["Enums"]["network_type"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          target_dex?: string
          target_network?: Database["public"]["Enums"]["network_type"] | null
          token_in?: string
          token_out?: string
          type?: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          gas_price: string | null
          gas_used: string | null
          hash: string | null
          id: string
          is_gasless: boolean | null
          is_submarine: boolean | null
          network: Database["public"]["Enums"]["network_type"]
          opportunity_id: string | null
          profit: number | null
          relayer_address: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          gas_price?: string | null
          gas_used?: string | null
          hash?: string | null
          id?: string
          is_gasless?: boolean | null
          is_submarine?: boolean | null
          network: Database["public"]["Enums"]["network_type"]
          opportunity_id?: string | null
          profit?: number | null
          relayer_address?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          gas_price?: string | null
          gas_used?: string | null
          hash?: string | null
          id?: string
          is_gasless?: boolean | null
          is_submarine?: boolean | null
          network?: Database["public"]["Enums"]["network_type"]
          opportunity_id?: string | null
          profit?: number | null
          relayer_address?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "arbitrage_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_execute: boolean | null
          created_at: string
          enabled_networks: Database["public"]["Enums"]["network_type"][] | null
          id: string
          max_gas_gwei: number | null
          min_profit_percent: number | null
          min_profit_usd: number | null
          scan_interval: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_execute?: boolean | null
          created_at?: string
          enabled_networks?:
            | Database["public"]["Enums"]["network_type"][]
            | null
          id?: string
          max_gas_gwei?: number | null
          min_profit_percent?: number | null
          min_profit_usd?: number | null
          scan_interval?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_execute?: boolean | null
          created_at?: string
          enabled_networks?:
            | Database["public"]["Enums"]["network_type"][]
            | null
          id?: string
          max_gas_gwei?: number | null
          min_profit_percent?: number | null
          min_profit_usd?: number | null
          scan_interval?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          address: string
          created_at: string
          id: string
          is_primary: boolean | null
          label: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          label?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      network_type: "ethereum" | "arbitrum" | "polygon" | "bsc"
      opportunity_status: "pending" | "executing" | "completed" | "failed"
      opportunity_type: "flash_loan" | "flash_swap" | "cross_chain"
      transaction_status: "pending" | "confirmed" | "failed"
      transaction_type: "flash_loan" | "swap" | "bridge" | "rebalance"
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
      network_type: ["ethereum", "arbitrum", "polygon", "bsc"],
      opportunity_status: ["pending", "executing", "completed", "failed"],
      opportunity_type: ["flash_loan", "flash_swap", "cross_chain"],
      transaction_status: ["pending", "confirmed", "failed"],
      transaction_type: ["flash_loan", "swap", "bridge", "rebalance"],
    },
  },
} as const
