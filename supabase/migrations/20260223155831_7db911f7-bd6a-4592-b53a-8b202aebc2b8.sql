-- Add verification fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_verified boolean NOT NULL DEFAULT false,
ADD COLUMN verification_selfie_url text DEFAULT NULL,
ADD COLUMN verified_at timestamp with time zone DEFAULT NULL;