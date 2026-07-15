import 'server-only';

import {getSupabaseAdminClient} from '@/lib/supabase/admin';

export type AdminCatalogProduct = {
  id: string;
  slug: string;
  title: string;
  status: 'Published' | 'Draft' | 'Archived';
  category_id: string;
  collection_id: string | null;
  cover_url: string;
};

export type AdminCatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: 'Active' | 'Hidden';
};

export type AdminCatalogCollection = {
  id: string;
  name: string;
  description: string;
  status: 'Published' | 'Draft';
  category_ids: string[];
};

export type AdminCatalogMedia = {
  id: string;
  name: string;
  asset_type: 'Cover' | 'Preview' | 'Video' | 'Delivery';
  product_slug: string | null;
  storage_path: string;
  public_url: string;
  status: 'Ready' | 'Processing';
};

export type AdminCatalogData = {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
  collections: AdminCatalogCollection[];
  media: AdminCatalogMedia[];
};

function mediaPublicUrl(storagePath: string, publicUrl: string | null, assetType: string) {
  if (assetType === 'Delivery') return '';
  if (publicUrl) return publicUrl;
  if (!storagePath) return '';
  return getSupabaseAdminClient().storage.from('akl-previews').getPublicUrl(storagePath).data.publicUrl;
}

export async function loadAdminCatalogData(): Promise<AdminCatalogData> {
  const admin = getSupabaseAdminClient();
  const [productsResult, categoriesResult, collectionsResult, mediaResult] = await Promise.all([
    admin.from('akl_products').select('id,slug,title,status,category_id,collection_id,cover_url').order('title'),
    admin.from('akl_categories').select('id,slug,name,description,status').order('name'),
    admin.from('akl_collections').select('id,name,description,status,category_ids').order('name'),
    admin.from('akl_media_assets').select('id,name,asset_type,product_slug,storage_path,public_url,status').order('created_at', {ascending: false}),
  ]);

  const error = productsResult.error || categoriesResult.error || collectionsResult.error || mediaResult.error;
  if (error) throw new Error(error.message);

  return {
    products: (productsResult.data || []).map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      category_id: row.category_id,
      collection_id: row.collection_id,
      cover_url: row.cover_url || '',
    })) as AdminCatalogProduct[],
    categories: (categoriesResult.data || []).map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      status: row.status,
    })) as AdminCatalogCategory[],
    collections: (collectionsResult.data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: row.status,
      category_ids: row.category_ids || [],
    })) as AdminCatalogCollection[],
    media: (mediaResult.data || []).map(row => ({
      id: row.id,
      name: row.name,
      asset_type: row.asset_type,
      product_slug: row.product_slug,
      storage_path: row.storage_path || '',
      public_url: mediaPublicUrl(row.storage_path || '', row.public_url, row.asset_type),
      status: row.status,
    })) as AdminCatalogMedia[],
  };
}
