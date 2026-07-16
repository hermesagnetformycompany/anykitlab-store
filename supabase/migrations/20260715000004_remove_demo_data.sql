-- Historical note: this migration originally deleted the entire seeded catalog.
-- The original AnyKit Lab catalog is now the approved baseline and must be preserved.
-- Keep this migration as an intentional no-op so existing linked databases can advance
-- to the schema/media migrations without deleting products, categories, collections,
-- orders, customer access, or uploaded assets.

select 1;
