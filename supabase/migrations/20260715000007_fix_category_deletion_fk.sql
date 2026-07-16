-- Fix: Category deletion blocked by FK constraint
-- The original schema had akl_products.category_id with ON DELETE RESTRICT (default)
-- This prevents deleting any category that has products referencing it
-- Change to ON DELETE SET NULL so deleting a category nulls the product's category_id

-- Step 1: Make category_id nullable (required for ON DELETE SET NULL)
ALTER TABLE akl_products ALTER COLUMN category_id DROP NOT NULL;

-- Step 2: Drop and recreate the FK constraint with ON DELETE SET NULL
ALTER TABLE akl_products DROP CONSTRAINT IF EXISTS akl_products_category_id_fkey;
ALTER TABLE akl_products ADD CONSTRAINT akl_products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.akl_categories(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 3: Ensure collection FK is also correct (should already be nullable)
ALTER TABLE akl_products DROP CONSTRAINT IF EXISTS akl_products_collection_id_fkey;
ALTER TABLE akl_products ADD CONSTRAINT akl_products_collection_id_fkey
  FOREIGN KEY (collection_id) REFERENCES public.akl_collections(id)
  ON UPDATE CASCADE ON DELETE SET NULL;