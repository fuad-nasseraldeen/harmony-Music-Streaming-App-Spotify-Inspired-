-- Migration: Add is_subscribed field to users table
-- Run this in your Supabase SQL Editor if you already have a users table

-- Add the is_subscribed column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_subscribed boolean DEFAULT false NOT NULL;

-- Update existing users based on their subscription status
UPDATE users
SET is_subscribed = true
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM subscriptions 
  WHERE status IN ('active', 'trialing')
);

-- Update the trigger function to include is_subscribed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS
$$
  BEGIN
    INSERT INTO public.users (id, full_name, avatar_url, is_subscribed)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', false);
    RETURN new;
  END;
$$
LANGUAGE plpgsql SECURITY DEFINER;
