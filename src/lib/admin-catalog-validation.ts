export type CatalogResource = 'products' | 'categories' | 'collections';

const catalogIdPattern = /^[a-zA-Z0-9_-]{2,120}$/;

function requiredText(value: unknown, label: string, maxLength = 160) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  return text;
}

function optionalText(value: unknown, label: string, maxLength: number) {
  const text = String(value || '').trim();
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  return text;
}

function catalogId(value: unknown, label: string) {
  const id = requiredText(value, label, 120);
  if (!catalogIdPattern.test(id)) throw new Error(`${label} is invalid.`);
  return id;
}

function slugValue(value: unknown) {
  const slug = requiredText(value, 'Slug', 120).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Use a lowercase slug with letters, numbers, and single hyphens.');
  }
  return slug;
}

function integerValue(value: unknown, label: string, minimum = 0) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    throw new Error(`${label} must be a whole number of at least ${minimum}.`);
  }
  return number;
}

function optionalAssetUrl(value: unknown, label: string) {
  const text = optionalText(value, label, 2048);
  if (!text) return '';
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  try {
    const url = new URL(text);
    if (url.protocol === 'https:') return url.toString();
  } catch {}
  throw new Error(`${label} must be a secure web or site-relative URL.`);
}

function colorValue(value: unknown, label: string, fallback: string) {
  const color = String(value || '').trim() || fallback;
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`${label} must be a six-digit hex colour.`);
  return color.toLowerCase();
}

function stringList(value: unknown, label: string, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new Error(`${label} has too many entries.`);
  return [...new Set(value.map(entry => requiredText(entry, `${label} entry`, 160)))];
}

function idList(value: unknown, label: string, maxItems = 100) {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new Error(`${label} has too many entries.`);
  return [...new Set(value.map(entry => catalogId(entry, `${label} entry`)))];
}

export function mapCatalogRow(resource: CatalogResource, id: string, item: Record<string, unknown>) {
  const safeId = catalogId(id, 'Catalog item ID');
  if (String(item.id || safeId) !== safeId) throw new Error('The catalog item ID does not match the request.');
  const updatedAt = new Date().toISOString();

  if (resource === 'products') {
    const status = String(item.status || 'Draft');
    if (!['Published', 'Draft', 'Archived'].includes(status)) throw new Error('Invalid product status.');
    const price = integerValue(item.price, 'Price');
    const mrp = integerValue(item.mrp, 'Compare-at price');
    if (mrp < price) throw new Error('Compare-at price cannot be lower than the selling price.');
    return {
      id: safeId,
      slug: slugValue(item.slug),
      title: requiredText(item.title, 'Title'),
      category_id: catalogId(item.categoryId, 'Category'),
      collection_id: item.collectionId ? catalogId(item.collectionId, 'Collection') : null,
      price,
      mrp,
      layout_count: integerValue(item.layoutCount, 'Layout count', 1),
      description: optionalText(item.description, 'Description', 1000),
      long_description: optionalText(item.long, 'Long description', 10000),
      accent: colorValue(item.accent, 'Accent colour', '#f0642f'),
      dark: colorValue(item.dark, 'Dark colour', '#191917'),
      badge: optionalText(item.badge, 'Badge', 60),
      status,
      formats: stringList(item.formats, 'Formats'),
      includes: stringList(item.includes, 'Includes'),
      cover_name: optionalText(item.coverName, 'Cover name', 255),
      cover_url: optionalAssetUrl(item.coverUrl, 'Cover URL'),
      delivery_name: optionalText(item.deliveryName, 'Delivery name', 255),
      updated_at: updatedAt,
    };
  }

  if (resource === 'categories') {
    const status = String(item.status || 'Active');
    if (!['Active', 'Hidden'].includes(status)) throw new Error('Invalid category status.');
    return {
      id: safeId,
      slug: slugValue(item.slug),
      name: requiredText(item.name, 'Category name'),
      description: optionalText(item.description, 'Description', 1000),
      status,
      image_url: optionalAssetUrl(item.imageUrl, 'Category image URL'),
      updated_at: updatedAt,
    };
  }

  const status = String(item.status || 'Draft');
  if (!['Published', 'Draft'].includes(status)) throw new Error('Invalid collection status.');
  return {
    id: safeId,
    name: requiredText(item.name, 'Collection name'),
    description: optionalText(item.description, 'Description', 1000),
    status,
    category_ids: idList(item.categoryIds, 'Categories'),
    image_url: optionalAssetUrl(item.imageUrl, 'Collection image URL'),
    updated_at: updatedAt,
  };
}
