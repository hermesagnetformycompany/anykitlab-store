import {
  categories as fallbackCategories,
  collections as fallbackCollections,
  products as fallbackProducts,
  type Category,
  type Collection,
  type Product,
} from './data';
import {hasSupabaseConfig} from './supabase/config';
import {getSupabasePublicClient} from './supabase/public';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: Category['status'];
  product_count: number;
};

type CollectionRow = {
  id: string;
  name: string;
  description: string;
  status: Collection['status'];
  category_ids: string[];
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  collection_id: string | null;
  price: number;
  mrp: number;
  layout_count: number;
  description: string;
  long_description: string;
  cover_url: string | null;
  accent: string;
  dark: string;
  badge: string;
  status: Product['status'];
  formats: string[];
  includes: string[];
  updated_at: string;
};

export type CatalogData = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  source: 'supabase' | 'fallback';
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value));
}

function publicFallback(): CatalogData {
  const categories = fallbackCategories.filter(category => category.status === 'Active');
  const collections = fallbackCollections.filter(collection => collection.status === 'Published');
  const categoryIds = new Set(categories.map(category => category.id));
  const collectionIds = new Set(collections.map(collection => collection.id));
  const products = fallbackProducts.filter(product => product.status === 'Published' && categoryIds.has(product.categoryId) && (!product.collectionId || collectionIds.has(product.collectionId)));
  return {products, categories, collections, source: 'fallback'};
}

export async function getCatalogData(): Promise<CatalogData> {
  if (!hasSupabaseConfig()) return publicFallback();

  try {
    const supabase = getSupabasePublicClient();
    const [categoryResult, collectionResult, productResult] = await Promise.all([
      supabase.from('akl_categories').select('id,slug,name,description,status,product_count').eq('status', 'Active').order('name'),
      supabase.from('akl_collections').select('id,name,description,status,category_ids').eq('status', 'Published').order('name'),
      supabase.from('akl_products').select('id,slug,title,category_id,collection_id,price,mrp,layout_count,description,long_description,cover_url,accent,dark,badge,status,formats,includes,updated_at').eq('status', 'Published').order('created_at'),
    ]);

    const error = categoryResult.error || collectionResult.error || productResult.error;
    if (error) throw error;

    const categories = ((categoryResult.data || []) as CategoryRow[]).map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      status: row.status,
      productCount: row.product_count,
    }));
    const categoryNames = new Map(categories.map(category => [category.id, category.name]));
    const categoryIds = new Set(categoryNames.keys());
    const collections = ((collectionResult.data || []) as CollectionRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      categoryIds: row.category_ids || [],
    }));
    const collectionIds = new Set(collections.map(collection => collection.id));
    const products = ((productResult.data || []) as ProductRow[])
      .filter(row => categoryIds.has(row.category_id) && (!row.collection_id || collectionIds.has(row.collection_id)))
      .map(row => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        categoryId: row.category_id,
        category: categoryNames.get(row.category_id) || 'Uncategorised',
        collectionId: row.collection_id || '',
        price: row.price,
        mrp: row.mrp,
        layoutCount: row.layout_count,
        count: `${row.layout_count}+ layouts`,
        description: row.description,
        long: row.long_description,
        coverUrl: row.cover_url || undefined,
        accent: row.accent,
        dark: row.dark,
        badge: row.badge,
        status: row.status,
        formats: row.formats || [],
        includes: row.includes || [],
        updatedAt: formatDate(row.updated_at),
      }));

    return {products, categories, collections, source: 'supabase'};
  } catch (error) {
    console.error('Supabase catalog fallback:', error instanceof Error ? error.message : error);
    return publicFallback();
  }
}
