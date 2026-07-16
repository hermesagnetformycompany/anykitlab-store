-- Category deletion uses ON DELETE SET NULL, so category_id must be nullable.
alter table public.akl_products alter column category_id drop not null;
