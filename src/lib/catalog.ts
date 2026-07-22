import {
  categories as fallbackCategories,
  collections as fallbackCollections,
  products as fallbackProducts,
  type Category,
  type Collection,
  type Product,
  type StoreSettings,
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
  image_url: string | null;
};

type CollectionRow = {
  id: string;
  name: string;
  description: string;
  status: Collection['status'];
  category_ids: string[];
  image_url: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
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

type MediaRow = {
  product_slug: string | null;
  asset_type: 'Cover' | 'Preview' | 'Video' | 'Delivery';
  storage_path: string;
  public_url: string | null;
  status: 'Ready' | 'Processing';
};

export type CatalogData = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  settings: StoreSettings;
  source: 'supabase' | 'fallback';
};

const defaultSettings: StoreSettings = {
  storeName: 'AnyKit Lab',
  supportEmail: 'hello@anykitlab.com',
  upiId: '',
  verificationSla: '12–24 hours',
  senderName: 'AnyKit Lab Delivery',
  heroImage1: '/reference/gym-kit.png',
  heroImage2: '/reference/lash-kit.png',
  heroImage3: '/reference/detail-kit.png',
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}).format(date);
}

function publicFallback(): CatalogData {
  const categories = fallbackCategories.filter(category => category.status === 'Active');
  const collections = fallbackCollections.filter(collection => collection.status === 'Published');
  const categoryIds = new Set(categories.map(category => category.id));
  const products = fallbackProducts.filter(product => product.status === 'Published' && categoryIds.has(product.categoryId));
  return {products, categories, collections, settings: defaultSettings, source: 'fallback'};
}

export async function getCatalogData(): Promise<CatalogData> {
  if (!hasSupabaseConfig()) {
    console.log('[catalog] No Supabase config found — using empty fallback');
    return publicFallback();
  }

  try {
    const supabase = getSupabasePublicClient();
    const [categoryResult, collectionResult, productResult, mediaResult, settingsResult] = await Promise.all([
      supabase.from('akl_categories').select('id,slug,name,description,status,product_count,image_url').eq('status', 'Active').order('name'),
      supabase.from('akl_collections').select('id,name,description,status,category_ids,image_url').eq('status', 'Published').order('name'),
      supabase.from('akl_products').select('id,slug,title,category_id,collection_id,price,mrp,layout_count,description,long_description,cover_url,accent,dark,badge,status,formats,includes,updated_at').eq('status', 'Published').order('created_at'),
      supabase.from('akl_media_assets').select('product_slug,asset_type,storage_path,public_url,status,created_at').neq('asset_type', 'Delivery').eq('status', 'Ready').order('created_at'),
      supabase.from('akl_site_settings').select('store_name,support_email,upi_id,verification_sla,sender_name,hero_image_1,hero_image_2,hero_image_3').eq('id', 'storefront').maybeSingle(),
    ]);

    const errors = [categoryResult.error, collectionResult.error, productResult.error, mediaResult.error, settingsResult.error].filter(Boolean);
    if (errors.length > 0) {
      console.error('[catalog] Supabase query errors:', errors.map(e => e!.message));
      throw new Error(`Supabase errors: ${errors.map(e => e!.message).join('; ')}`);
    }

    const categories = ((categoryResult.data || []) as CategoryRow[]).map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      status: row.status,
      productCount: row.product_count,
      imageUrl: row.image_url || undefined,
    }));
    const categoryNames = new Map(categories.map(category => [category.id, category.name]));
    const collections = ((collectionResult.data || []) as CollectionRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      categoryIds: row.category_ids || [],
      imageUrl: row.image_url || undefined,
    }));

    const settingsRow = settingsResult.data;
    const settings: StoreSettings = settingsRow ? {
      storeName: settingsRow.store_name,
      supportEmail: settingsRow.support_email,
      upiId: settingsRow.upi_id,
      verificationSla: settingsRow.verification_sla,
      senderName: settingsRow.sender_name,
      heroImage1: settingsRow.hero_image_1 || defaultSettings.heroImage1,
      heroImage2: settingsRow.hero_image_2 || defaultSettings.heroImage2,
      heroImage3: settingsRow.hero_image_3 || defaultSettings.heroImage3,
    } : defaultSettings;

    const mediaByProduct = new Map<string, {type: MediaRow['asset_type']; url: string}[]>();
    for (const row of (mediaResult.data || []) as MediaRow[]) {
      if (!row.product_slug || !row.storage_path) continue;
      const derivedUrl = supabase.storage.from('akl-previews').getPublicUrl(row.storage_path).data.publicUrl;
      const url = row.public_url || derivedUrl;
      if (!url) continue;
      const current = mediaByProduct.get(row.product_slug) || [];
      current.push({type: row.asset_type, url});
      mediaByProduct.set(row.product_slug, current);
    }

    const products = ((productResult.data || []) as ProductRow[])
      .map(row => {
        const media = mediaByProduct.get(row.slug) || [];
        const mediaCover = media.find(item => item.type === 'Cover')?.url;
        const coverUrl = row.cover_url || mediaCover || undefined;
        const previewUrls = [...new Set(media.map(item => item.url).filter(url => url && url !== coverUrl))];
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          categoryId: row.category_id || '',
          category: row.category_id ? categoryNames.get(row.category_id) || 'Uncategorised' : 'Uncategorised',
          collectionId: row.collection_id || '',
          price: row.price,
          mrp: row.mrp,
          layoutCount: row.layout_count,
          count: `${row.layout_count}+ layouts`,
          description: row.description,
          long: row.long_description,
          coverUrl,
          previewUrl: previewUrls[0],
          previewUrls,
          accent: row.accent,
          dark: row.dark,
          badge: row.badge,
          status: row.status,
          formats: row.formats || [],
          includes: row.includes || [],
          updatedAt: formatDate(row.updated_at),
        } satisfies Product;
      });

    console.log(`[catalog] Supabase returned: ${categories.length} categories, ${collections.length} collections, ${products.length} products`);
    return {products, categories, collections, settings, source: 'supabase'};
  } catch (error) {
    console.error('[catalog] Supabase fetch failed, using fallback:', error instanceof Error ? error.message : error);
    return publicFallback();
  }
}