-- Add image_url columns for category and collection banners
ALTER TABLE akl_categories ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
ALTER TABLE akl_collections ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- Add hero banner image columns to site settings
ALTER TABLE akl_site_settings ADD COLUMN IF NOT EXISTS hero_image_1 text DEFAULT '';
ALTER TABLE akl_site_settings ADD COLUMN IF NOT EXISTS hero_image_2 text DEFAULT '';
ALTER TABLE akl_site_settings ADD COLUMN IF NOT EXISTS hero_image_3 text DEFAULT '';