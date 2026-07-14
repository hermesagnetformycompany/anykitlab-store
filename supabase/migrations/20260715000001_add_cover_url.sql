-- Add cover_url column to akl_products table
-- This allows admin-uploaded cover images to be displayed on the storefront
ALTER TABLE akl_products ADD COLUMN IF NOT EXISTS cover_url text DEFAULT '';