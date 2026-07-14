-- Fix: Prevent seed data from overwriting admin changes on deploy
-- The original migration used ON CONFLICT DO UPDATE which re-seeded
-- categories, collections, products and media on every deploy,
-- undoing any deletions or edits made from the admin panel.

-- Drop and re-insert with ON CONFLICT DO NOTHING so seed data only
-- populates on first run, never overwrites admin changes.

-- First, add cover_url column if it doesn't exist yet
ALTER TABLE akl_products ADD COLUMN IF NOT EXISTS cover_url text DEFAULT '';

-- Fix the category FK to allow deletion (ON DELETE SET NULL instead of RESTRICT)
ALTER TABLE akl_products DROP CONSTRAINT IF EXISTS akl_products_category_id_fkey;
ALTER TABLE akl_products ADD CONSTRAINT akl_products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.akl_categories(id)
  ON UPDATE CASCADE ON DELETE SET NULL;