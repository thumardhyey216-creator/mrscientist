-- Add trial_used column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;
