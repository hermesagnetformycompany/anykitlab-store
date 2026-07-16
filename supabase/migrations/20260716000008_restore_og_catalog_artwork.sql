-- Restore the approved OG AnyKit Lab artwork without changing catalog copy or prices.
-- These assets ship with the storefront and remain editable from the admin workspace.

update public.akl_products set cover_url = case slug
  when 'gym-fitness-instagram-templates' then '/reference/gym-kit.png'
  when 'lash-tech-instagram-templates' then '/reference/lash-kit.png'
  when 'the-detail-authority' then '/reference/detail-kit.png'
  when 'real-estate-social-media-kit' then '/reference/realestate-kit.png'
  when 'food-restaurant-social-media-kit' then '/reference/food-kit.png'
  when 'coaches-consultants-business-kit' then '/reference/coach-kit.png'
  else cover_url
end
where slug in (
  'gym-fitness-instagram-templates',
  'lash-tech-instagram-templates',
  'the-detail-authority',
  'real-estate-social-media-kit',
  'food-restaurant-social-media-kit',
  'coaches-consultants-business-kit'
);

update public.akl_categories set image_url = case slug
  when 'fitness' then '/reference/gym-kit.png'
  when 'beauty' then '/reference/lash-kit.png'
  when 'automotive' then '/reference/detail-kit.png'
  when 'real-estate' then '/reference/realestate-kit.png'
  when 'food' then '/reference/food-kit.png'
  when 'coaching' then '/reference/coach-kit.png'
  else image_url
end;

update public.akl_collections set image_url = case id
  when 'col-social' then '/reference/hero-kits.png'
  when 'col-launch' then '/reference/coach-kit.png'
  else image_url
end;

update public.akl_site_settings set
  hero_image_1 = coalesce(nullif(hero_image_1, ''), '/reference/gym-kit.png'),
  hero_image_2 = coalesce(nullif(hero_image_2, ''), '/reference/lash-kit.png'),
  hero_image_3 = coalesce(nullif(hero_image_3, ''), '/reference/detail-kit.png')
where id = 'storefront';

-- Reconnect the approved, uploaded fitness kit cover that was left unassigned.
update public.akl_media_assets
set product_slug = 'fitness-brand-social-media-template-pack'
where product_slug is null
  and asset_type = 'Cover'
  and name = 'Fitness Brand Social Media Template Pack.png';

update public.akl_media_assets
set public_url = 'https://bcrlafenerjlscsqvdvc.supabase.co/storage/v1/object/public/akl-previews/' || storage_path
where product_slug = 'fitness-brand-social-media-template-pack'
  and asset_type = 'Cover'
  and storage_path <> ''
  and coalesce(public_url, '') = '';

update public.akl_products product
set cover_url = media.public_url
from public.akl_media_assets media
where product.slug = 'fitness-brand-social-media-template-pack'
  and media.product_slug = product.slug
  and media.asset_type = 'Cover'
  and coalesce(media.public_url, '') <> '';
