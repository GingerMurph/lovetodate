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
      game_moves: {
        Row: {
          created_at: string
          game_id: string
          id: string
          move_data: Json
          player_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          move_data: Json
          player_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          move_data?: Json
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          creator_id: string
          current_turn: string | null
          game_state: Json
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          opponent_id: string
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_turn?: string | null
          game_state?: Json
          game_type: Database["public"]["Enums"]["game_type"]
          id?: string
          opponent_id: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_turn?: string | null
          game_state?: Json
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          opponent_id?: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          in_app_sound: boolean
          phone_number: string | null
          sms_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          in_app_sound?: boolean
          phone_number?: string | null
          sms_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          in_app_sound?: boolean
          phone_number?: string | null
          sms_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_prompts: {
        Row: {
          answer_text: string
          created_at: string
          display_order: number
          id: string
          prompt_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          display_order?: number
          id?: string
          prompt_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          display_order?: number
          id?: string
          prompt_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          body_build: Database["public"]["Enums"]["body_build"] | null
          children: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          drinking: string | null
          education: string | null
          ethnicity: string | null
          favourite_film: string[] | null
          favourite_hobbies: string[] | null
          favourite_music: string[] | null
          favourite_sport: string[] | null
          gender: Database["public"]["Enums"]["gender"] | null
          height_cm: number | null
          id: string
          interests: string[] | null
          is_paused: boolean
          is_verified: boolean
          languages: string[] | null
          latitude: number | null
          location_city: string | null
          location_country: string | null
          longitude: number | null
          looking_for: Database["public"]["Enums"]["looking_for"] | null
          max_distance_miles: number | null
          nationality: string | null
          non_negotiables: string[] | null
          occupation: string | null
          personality_type: string | null
          pets: string | null
          photo_urls: string[] | null
          political_beliefs: string | null
          relationship_goal: string[] | null
          religion: string | null
          smoking: string | null
          updated_at: string
          user_id: string
          verification_selfie_url: string | null
          verified_at: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          body_build?: Database["public"]["Enums"]["body_build"] | null
          children?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          drinking?: string | null
          education?: string | null
          ethnicity?: string | null
          favourite_film?: string[] | null
          favourite_hobbies?: string[] | null
          favourite_music?: string[] | null
          favourite_sport?: string[] | null
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_paused?: boolean
          is_verified?: boolean
          languages?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          longitude?: number | null
          looking_for?: Database["public"]["Enums"]["looking_for"] | null
          max_distance_miles?: number | null
          nationality?: string | null
          non_negotiables?: string[] | null
          occupation?: string | null
          personality_type?: string | null
          pets?: string | null
          photo_urls?: string[] | null
          political_beliefs?: string | null
          relationship_goal?: string[] | null
          religion?: string | null
          smoking?: string | null
          updated_at?: string
          user_id: string
          verification_selfie_url?: string | null
          verified_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          body_build?: Database["public"]["Enums"]["body_build"] | null
          children?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          drinking?: string | null
          education?: string | null
          ethnicity?: string | null
          favourite_film?: string[] | null
          favourite_hobbies?: string[] | null
          favourite_music?: string[] | null
          favourite_sport?: string[] | null
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_paused?: boolean
          is_verified?: boolean
          languages?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          longitude?: number | null
          looking_for?: Database["public"]["Enums"]["looking_for"] | null
          max_distance_miles?: number | null
          nationality?: string | null
          non_negotiables?: string[] | null
          occupation?: string | null
          personality_type?: string | null
          pets?: string | null
          photo_urls?: string[] | null
          political_beliefs?: string | null
          relationship_goal?: string[] | null
          religion?: string | null
          smoking?: string | null
          updated_at?: string
          user_id?: string
          verification_selfie_url?: string | null
          verified_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          function_name: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          function_name: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          function_name?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      subscriber_cache: {
        Row: {
          checked_at: string
          is_subscribed: boolean
          user_id: string
        }
        Insert: {
          checked_at?: string
          is_subscribed?: boolean
          user_id: string
        }
        Update: {
          checked_at?: string
          is_subscribed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      unlocked_connections: {
        Row: {
          created_at: string
          id: string
          target_id: string
          unlocker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          unlocker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          unlocker_id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_challenges: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          pose: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          pose: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          pose?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      video_calls: {
        Row: {
          callee_id: string
          caller_id: string
          channel_name: string
          created_at: string
          ended_at: string | null
          id: string
          status: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          channel_name: string
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          channel_name?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
    }
    Enums: {
      body_build:
        | "slim"
        | "athletic"
        | "average"
        | "curvy"
        | "muscular"
        | "heavyset"
        | "petite"
      game_status: "pending" | "active" | "completed" | "declined"
      game_type: "noughts_crosses" | "connect4" | "hypothetical_questions"
      gender: "male" | "female" | "non_binary" | "other"
      looking_for: "male" | "female" | "everyone"
      relationship_goal:
        | "long_term"
        | "short_term"
        | "casual"
        | "friendship"
        | "not_sure"
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
      body_build: [
        "slim",
        "athletic",
        "average",
        "curvy",
        "muscular",
        "heavyset",
        "petite",
      ],
      game_status: ["pending", "active", "completed", "declined"],
      game_type: ["noughts_crosses", "connect4", "hypothetical_questions"],
      gender: ["male", "female", "non_binary", "other"],
      looking_for: ["male", "female", "everyone"],
      relationship_goal: [
        "long_term",
        "short_term",
        "casual",
        "friendship",
        "not_sure",
      ],
    },
  },
} as const
