create extension if not exists pgcrypto;

create table if not exists public.akl_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'owner', 'catalog_manager', 'payment_reviewer', 'support')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.akl_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Hidden')),
  product_count integer not null default 0 check (product_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.akl_collections (
  id text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'Draft' check (status in ('Published', 'Draft')),
  category_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.akl_products (
  id text primary key,
  slug text not null unique,
  title text not null,
  category_id text not null references public.akl_categories(id) on update cascade,
  collection_id text references public.akl_collections(id) on update cascade on delete set null,
  price integer not null check (price >= 0),
  mrp integer not null check (mrp >= price),
  layout_count integer not null default 1 check (layout_count > 0),
  description text not null default '',
  long_description text not null default '',
  accent text not null default '#f0642f',
  dark text not null default '#191917',
  badge text not null default '',
  status text not null default 'Draft' check (status in ('Published', 'Draft', 'Archived')),
  formats text[] not null default '{}',
  includes text[] not null default '{}',
  cover_name text not null default '',
  delivery_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists akl_products_category_idx on public.akl_products(category_id);
create index if not exists akl_products_collection_idx on public.akl_products(collection_id);
create index if not exists akl_products_status_idx on public.akl_products(status);

create table if not exists public.akl_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('AKL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  total integer not null check (total >= 0),
  payment_reference text not null,
  payment_method text not null default 'UPI',
  status text not null default 'Pending verification' check (status in ('Pending verification', 'Verified', 'Access sent', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists akl_orders_user_idx on public.akl_orders(user_id, created_at desc);
create index if not exists akl_orders_status_idx on public.akl_orders(status, created_at desc);
create unique index if not exists akl_orders_reference_idx on public.akl_orders(lower(payment_reference));

create table if not exists public.akl_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.akl_orders(id) on delete cascade,
  product_id text references public.akl_products(id) on delete set null,
  product_slug text not null,
  product_title text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists akl_order_items_order_idx on public.akl_order_items(order_id);

create table if not exists public.akl_cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.akl_products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.akl_wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.akl_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.akl_product_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.akl_products(id) on delete cascade,
  order_id uuid references public.akl_orders(id) on delete set null,
  storage_path text,
  granted_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.akl_media_assets (
  id text primary key,
  name text not null,
  asset_type text not null check (asset_type in ('Cover', 'Preview', 'Video', 'Delivery')),
  product_slug text,
  storage_path text not null default '',
  status text not null default 'Ready' check (status in ('Ready', 'Processing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.akl_site_settings (
  id text primary key default 'storefront',
  store_name text not null default 'AnyKit Lab',
  support_email text not null default 'hello@anykitlab.com',
  upi_id text not null default 'anykitlab@upi',
  verification_sla text not null default '12–24 hours',
  sender_name text not null default 'AnyKit Lab Delivery',
  updated_at timestamptz not null default now()
);

create or replace function public.akl_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.akl_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.akl_profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('owner', 'catalog_manager', 'payment_reviewer', 'support')
  );
$$;

create or replace function public.akl_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.akl_profiles
    where id = auth.uid() and status = 'active' and role = 'owner'
  );
$$;

create or replace function public.akl_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'site', new.raw_user_meta_data ->> 'site', '') <> 'anykitlab' then
    return new;
  end if;

  insert into public.akl_profiles (id, full_name, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_app_meta_data ->> 'role', 'customer'),
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists akl_on_auth_user_created on auth.users;
create trigger akl_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.akl_handle_new_user();

create or replace function public.akl_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.akl_is_owner() then
    raise exception 'Only an AnyKit Lab owner can change staff roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists akl_profiles_protect_role on public.akl_profiles;
create trigger akl_profiles_protect_role
  before update on public.akl_profiles
  for each row execute procedure public.akl_protect_profile_role();

drop trigger if exists akl_categories_touch on public.akl_categories;
create trigger akl_categories_touch before update on public.akl_categories for each row execute procedure public.akl_touch_updated_at();
drop trigger if exists akl_collections_touch on public.akl_collections;
create trigger akl_collections_touch before update on public.akl_collections for each row execute procedure public.akl_touch_updated_at();
drop trigger if exists akl_products_touch on public.akl_products;
create trigger akl_products_touch before update on public.akl_products for each row execute procedure public.akl_touch_updated_at();
drop trigger if exists akl_orders_touch on public.akl_orders;
create trigger akl_orders_touch before update on public.akl_orders for each row execute procedure public.akl_touch_updated_at();
drop trigger if exists akl_media_touch on public.akl_media_assets;
create trigger akl_media_touch before update on public.akl_media_assets for each row execute procedure public.akl_touch_updated_at();
drop trigger if exists akl_settings_touch on public.akl_site_settings;
create trigger akl_settings_touch before update on public.akl_site_settings for each row execute procedure public.akl_touch_updated_at();

alter table public.akl_profiles enable row level security;
alter table public.akl_categories enable row level security;
alter table public.akl_collections enable row level security;
alter table public.akl_products enable row level security;
alter table public.akl_orders enable row level security;
alter table public.akl_order_items enable row level security;
alter table public.akl_cart_items enable row level security;
alter table public.akl_wishlist_items enable row level security;
alter table public.akl_product_access enable row level security;
alter table public.akl_media_assets enable row level security;
alter table public.akl_site_settings enable row level security;

create policy "akl profiles read own or admin" on public.akl_profiles for select to authenticated using (id = auth.uid() or public.akl_is_admin());
create policy "akl profiles update own" on public.akl_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "akl profiles owner manage" on public.akl_profiles for all to authenticated using (public.akl_is_owner()) with check (public.akl_is_owner());

create policy "akl public categories" on public.akl_categories for select to anon, authenticated using (status = 'Active' or public.akl_is_admin());
create policy "akl admin categories" on public.akl_categories for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());
create policy "akl public collections" on public.akl_collections for select to anon, authenticated using (status = 'Published' or public.akl_is_admin());
create policy "akl admin collections" on public.akl_collections for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());
create policy "akl public products" on public.akl_products for select to anon, authenticated using (status = 'Published' or public.akl_is_admin());
create policy "akl admin products" on public.akl_products for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());

create policy "akl orders read own or admin" on public.akl_orders for select to authenticated using (user_id = auth.uid() or public.akl_is_admin());
create policy "akl orders insert own" on public.akl_orders for insert to authenticated with check (user_id = auth.uid());
create policy "akl orders admin update" on public.akl_orders for update to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());
create policy "akl order items read own or admin" on public.akl_order_items for select to authenticated using (
  exists (select 1 from public.akl_orders o where o.id = order_id and (o.user_id = auth.uid() or public.akl_is_admin()))
);

create policy "akl cart own" on public.akl_cart_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "akl wishlist own" on public.akl_wishlist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "akl access own or admin" on public.akl_product_access for select to authenticated using (user_id = auth.uid() or public.akl_is_admin());
create policy "akl access admin manage" on public.akl_product_access for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());

create policy "akl public media" on public.akl_media_assets for select to anon, authenticated using (asset_type <> 'Delivery' or public.akl_is_admin());
create policy "akl admin media" on public.akl_media_assets for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());
create policy "akl public settings" on public.akl_site_settings for select to anon, authenticated using (id = 'storefront' or public.akl_is_admin());
create policy "akl admin settings" on public.akl_site_settings for all to authenticated using (public.akl_is_admin()) with check (public.akl_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('akl-previews', 'akl-previews', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4']),
  ('akl-deliveries', 'akl-deliveries', false, 52428800, array['application/zip', 'application/pdf', 'application/x-zip-compressed'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "akl preview files public read" on storage.objects for select to public using (bucket_id = 'akl-previews');
create policy "akl preview files admin write" on storage.objects for all to authenticated using (bucket_id = 'akl-previews' and public.akl_is_admin()) with check (bucket_id = 'akl-previews' and public.akl_is_admin());
create policy "akl delivery files entitled read" on storage.objects for select to authenticated using (
  bucket_id = 'akl-deliveries' and (public.akl_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);
create policy "akl delivery files admin write" on storage.objects for all to authenticated using (bucket_id = 'akl-deliveries' and public.akl_is_admin()) with check (bucket_id = 'akl-deliveries' and public.akl_is_admin());

insert into public.akl_categories (id, slug, name, description, status, product_count) values
  ('cat-fitness', 'fitness', 'Fitness & Wellness', 'For gyms, coaches, trainers and wellness brands.', 'Active', 1),
  ('cat-beauty', 'beauty', 'Beauty & Service', 'For beauty professionals, studios and appointment-led businesses.', 'Active', 1),
  ('cat-auto', 'automotive', 'Auto Detailing', 'For detailing studios, garages and automotive specialists.', 'Active', 1),
  ('cat-food', 'food', 'Food & Hospitality', 'For cafés, restaurants and food-led brands.', 'Active', 1),
  ('cat-realestate', 'real-estate', 'Real Estate', 'For agents, brokers and property businesses.', 'Active', 1),
  ('cat-coaching', 'coaching', 'Coaches & Consultants', 'For coaches, consultants and service-led experts.', 'Active', 1)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, status = excluded.status, product_count = excluded.product_count;

insert into public.akl_collections (id, name, description, status, category_ids) values
  ('col-social', 'Instagram Growth Kits', 'Complete feed, carousel and story systems.', 'Published', array['cat-fitness','cat-beauty','cat-auto']),
  ('col-launch', 'Launch & Offer Kits', 'Campaign-oriented layouts for new services and offers.', 'Draft', array['cat-fitness','cat-beauty'])
on conflict (id) do update set name = excluded.name, description = excluded.description, status = excluded.status, category_ids = excluded.category_ids;

insert into public.akl_products (id, slug, title, category_id, collection_id, price, mrp, layout_count, description, long_description, accent, dark, badge, status, formats, includes, delivery_name, updated_at) values
  ('tpl-001', 'gym-fitness-instagram-templates', 'Gym & Fitness Instagram Templates', 'cat-fitness', 'col-social', 799, 1499, 100, 'High-energy posts, stories and carousels for trainers and gyms.', 'A complete social kit designed to make fitness brands look focused, credible and ready to move. Every layout is fully editable in Canva.', '#b8ff64', '#111712', 'BESTSELLER', 'Published', array['Square posts','Stories','Carousels','Offer slides'], array['60 feed posts','24 story layouts','16 carousel slides','Caption prompt sheet'], 'fitness-delivery.zip', '2026-07-10T00:00:00Z'),
  ('tpl-002', 'lash-tech-instagram-templates', 'Lash Tech Instagram Templates', 'cat-beauty', 'col-social', 699, 1299, 80, 'Polished booking, aftercare and offer graphics for lash artists.', 'A refined content system for independent lash artists and beauty studios. Swap your colours, imagery and copy with no design experience required.', '#f4b9d1', '#291a24', 'NEW', 'Published', array['Square posts','Stories','Price cards','Highlight covers'], array['48 feed posts','20 story layouts','12 price & policy cards','Highlight cover set'], '', '2026-07-08T00:00:00Z'),
  ('tpl-003', 'the-detail-authority', 'The Detail Authority Canva Kit', 'cat-auto', 'col-social', 699, 1599, 70, 'Premium visual content built for serious detailing studios.', 'Turn meticulous craft into a premium presence. This bold kit gives detailing studios a confident, consistent look across every campaign.', '#81b7ff', '#101820', 'PRO KIT', 'Published', array['Square posts','Stories','Service menus','Before/after'], array['40 feed posts','18 story layouts','8 service menus','4 before/after frames'], '', '2026-07-05T00:00:00Z'),
  ('tpl-004', 'real-estate-social-media-kit', 'Real Estate Social Media Kit', 'cat-realestate', 'col-social', 699, 1299, 80, 'Property posts, listings and launch graphics for real estate professionals.', 'A complete Canva content kit for agents, brokers and property teams who need polished listings and consistent social media.', '#8aa3b0', '#15252d', 'POPULAR', 'Published', array['Property posts','Stories','Listing cards','Agent profiles'], array['48 feed posts','20 story layouts','8 listing cards','4 agent profiles'], '', '2026-07-12T00:00:00Z'),
  ('tpl-005', 'food-restaurant-social-media-kit', 'Food & Restaurant Social Media Kit', 'cat-food', 'col-social', 499, 999, 90, 'Menus, offers and food-first social templates for hospitality brands.', 'A warm and appetising Canva system for cafés, restaurants and food businesses that want a consistent feed.', '#e6a84a', '#2d2117', 'NEW', 'Published', array['Food posts','Stories','Menu cards','Offer layouts'], array['52 feed posts','24 story layouts','8 menu cards','6 offer layouts'], '', '2026-07-12T00:00:00Z'),
  ('tpl-006', 'coaches-consultants-business-kit', 'Coaches & Consultants Business Kit', 'cat-coaching', 'col-launch', 699, 1299, 90, 'Authority-building posts, offers and lead magnets for service experts.', 'A focused Canva content system for coaches and consultants who want to explain their value and launch offers clearly.', '#c98c5c', '#181716', 'STARTER', 'Published', array['Authority posts','Stories','Offer cards','Lead magnets'], array['54 feed posts','20 story layouts','10 offer cards','6 lead magnet covers'], '', '2026-07-12T00:00:00Z')
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  category_id = excluded.category_id,
  collection_id = excluded.collection_id,
  price = excluded.price,
  mrp = excluded.mrp,
  layout_count = excluded.layout_count,
  description = excluded.description,
  long_description = excluded.long_description,
  accent = excluded.accent,
  dark = excluded.dark,
  badge = excluded.badge,
  status = excluded.status,
  formats = excluded.formats,
  includes = excluded.includes;

insert into public.akl_media_assets (id, name, asset_type, product_slug, status) values
  ('med-001', 'fitness-cover.webp', 'Cover', 'gym-fitness-instagram-templates', 'Ready'),
  ('med-002', 'fitness-feed-preview.webp', 'Preview', 'gym-fitness-instagram-templates', 'Ready'),
  ('med-003', 'lash-cover.webp', 'Cover', 'lash-tech-instagram-templates', 'Ready'),
  ('med-004', 'detail-authority-cover.webp', 'Cover', 'the-detail-authority', 'Ready'),
  ('med-005', 'fitness-delivery.zip', 'Delivery', 'gym-fitness-instagram-templates', 'Ready')
on conflict (id) do update set name = excluded.name, asset_type = excluded.asset_type, product_slug = excluded.product_slug, status = excluded.status;

insert into public.akl_site_settings (id, store_name, support_email, upi_id, verification_sla, sender_name)
values ('storefront', 'AnyKit Lab', 'hello@anykitlab.com', 'anykitlab@upi', '12–24 hours', 'AnyKit Lab Delivery')
on conflict (id) do nothing;
