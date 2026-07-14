-- Remove all demo/seed data from the database
-- This clears the hardcoded categories, collections, products, and media
-- that were inserted by the original migration, so the admin starts fresh

DELETE FROM public.akl_media_assets;
DELETE FROM public.akl_order_items;
DELETE FROM public.akl_orders;
DELETE FROM public.akl_cart_items;
DELETE FROM public.akl_wishlist_items;
DELETE FROM public.akl_product_access;
DELETE FROM public.akl_products;
DELETE FROM public.akl_collections;
DELETE FROM public.akl_categories;

-- Reset site settings to defaults
UPDATE public.akl_site_settings SET
  store_name = 'AnyKit Lab',
  support_email = 'hello@anykitlab.com',
  upi_id = 'anykitlab@upi',
  verification_sla = '12-24 hours',
  sender_name = 'AnyKit Lab Delivery'
WHERE id = 'storefront';