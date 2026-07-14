-- Fix: Allow category deletion by setting product category_id to null instead of blocking
-- Previously akl_products.category_id had no ON DELETE clause (default RESTRICT)
-- which silently blocked deleting any category that had products referencing it

-- Drop the old constraint and add a new one with ON DELETE SET NULL
ALTER TABLE akl_products DROP CONSTRAINT IF EXISTS akl_products_category_id_fkey;
ALTER TABLE akl_products ADD CONSTRAINT akl_products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.akl_categories(id)
  ON UPDATE CASCADE ON DELETE SET NULL;