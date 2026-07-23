export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      gem_transactions: {
        Row: {
          created_at: string;
          delta: number;
          id: string;
          order_total_usd: number | null;
          reason: string;
          restaurant: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: string;
          order_total_usd?: number | null;
          reason: string;
          restaurant?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: string;
          order_total_usd?: number | null;
          reason?: string;
          restaurant?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      order_claims: {
        Row: {
          amount_usd: number;
          created_at: string;
          gems_awarded: number;
          id: string;
          order_number: string;
          restaurant: string;
          user_id: string;
        };
        Insert: {
          amount_usd?: number;
          created_at?: string;
          gems_awarded?: number;
          id?: string;
          order_number: string;
          restaurant: string;
          user_id: string;
        };
        Update: {
          amount_usd?: number;
          created_at?: string;
          gems_awarded?: number;
          id?: string;
          order_number?: string;
          restaurant?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          borough: string | null;
          budget: string;
          created_at: string;
          dietary_preferences: string[];
          display_name: string | null;
          email: string | null;
          favorite_chains: string[];
          gems_balance: number;
          health_conditions: string[];
          id: string;
          onboarded: boolean;
          preferred_language: string;
          updated_at: string;
          zip_code: string | null;
        };
        Insert: {
          borough?: string | null;
          budget?: string;
          created_at?: string;
          dietary_preferences?: string[];
          display_name?: string | null;
          email?: string | null;
          favorite_chains?: string[];
          gems_balance?: number;
          health_conditions?: string[];
          id: string;
          onboarded?: boolean;
          preferred_language?: string;
          updated_at?: string;
          zip_code?: string | null;
        };
        Update: {
          borough?: string | null;
          budget?: string;
          created_at?: string;
          dietary_preferences?: string[];
          display_name?: string | null;
          email?: string | null;
          favorite_chains?: string[];
          gems_balance?: number;
          health_conditions?: string[];
          id?: string;
          onboarded?: boolean;
          preferred_language?: string;
          updated_at?: string;
          zip_code?: string | null;
        };
        Relationships: [];
      };
      reward_redemptions: {
        Row: {
          code: string;
          created_at: string;
          gems_spent: number;
          id: string;
          reward_id: string;
          user_id: string;
        };
        Insert: {
          code?: string;
          created_at?: string;
          gems_spent: number;
          id?: string;
          reward_id: string;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          gems_spent?: number;
          id?: string;
          reward_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "rewards_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards_catalog: {
        Row: {
          created_at: string;
          description: string;
          gems_cost: number;
          id: string;
          image_url: string | null;
          name: string;
          restaurant: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string;
          gems_cost: number;
          id?: string;
          image_url?: string | null;
          name: string;
          restaurant?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          gems_cost?: number;
          id?: string;
          image_url?: string | null;
          name?: string;
          restaurant?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
