-- Add public_url column to media assets table
-- This stores the public Supabase Storage URL so media can be assigned to templates
ALTER TABLE akl_media_assets ADD COLUMN IF NOT EXISTS public_url text DEFAULT '';