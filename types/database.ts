export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          billing_address: Json | null;
          payment_method: Json | null;
          is_subscribed: boolean;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          billing_address?: Json | null;
          payment_method?: Json | null;
          is_subscribed?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          billing_address?: Json | null;
          payment_method?: Json | null;
          is_subscribed?: boolean;
        };
      };
      songs: {
        Row: {
          id: string;
          user_id: string;
          author: string;
          title: string;
          song_path: string;
          image_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          author: string;
          title: string;
          song_path: string;
          image_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          author?: string;
          title?: string;
          song_path?: string;
          image_path?: string;
          created_at?: string;
        };
      };
      liked_songs: {
        Row: {
          user_id: string;
          song_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          song_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          song_id?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          active: boolean | null;
          name: string | null;
          description: string | null;
          image: string | null;
          metadata: Json | null;
        };
        Insert: {
          id: string;
          active?: boolean | null;
          name?: string | null;
          description?: string | null;
          image?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          active?: boolean | null;
          name?: string | null;
          description?: string | null;
          image?: string | null;
          metadata?: Json | null;
        };
      };
      prices: {
        Row: {
          id: string;
          product_id: string | null;
          active: boolean | null;
          description: string | null;
          unit_amount: number | null;
          currency: string | null;
          type: string | null;
          interval: string | null;
          interval_count: number | null;
          trial_period_days: number | null;
          metadata: Json | null;
        };
        Insert: {
          id: string;
          product_id?: string | null;
          active?: boolean | null;
          description?: string | null;
          unit_amount?: number | null;
          currency?: string | null;
          type?: string | null;
          interval?: string | null;
          interval_count?: number | null;
          trial_period_days?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          active?: boolean | null;
          description?: string | null;
          unit_amount?: number | null;
          currency?: string | null;
          type?: string | null;
          interval?: string | null;
          interval_count?: number | null;
          trial_period_days?: number | null;
          metadata?: Json | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: string | null;
          metadata: Json | null;
          price_id: string | null;
          quantity: number | null;
          cancel_at_period_end: boolean | null;
          created: string;
          current_period_start: string;
          current_period_end: string;
          ended_at: string | null;
          cancel_at: string | null;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          status?: string | null;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          cancel_at_period_end?: boolean | null;
          created?: string;
          current_period_start: string;
          current_period_end: string;
          ended_at?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: string | null;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          cancel_at_period_end?: boolean | null;
          created?: string;
          current_period_start?: string;
          current_period_end?: string;
          ended_at?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
        };
      };
    };
  };
}
