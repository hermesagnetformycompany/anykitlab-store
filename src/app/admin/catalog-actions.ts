'use server';

import {revalidatePath} from 'next/cache';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {loadAdminCatalogData, type AdminCatalogData} from '@/lib/admin-catalog-data';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

type ActionResult = {
  ok: boolean;
  data?: AdminCatalogData;
  error?: string;
  requiresCascade?: boolean;
};

async function requireCatalogAdmin() {
  const admin = await getVerifiedAdmin();
  if (!admin || !['Owner', 'Catalog manager'].includes(admin.role)) {
    throw new Error('Catalog administrator access is required.');
  }
  return admin;
}

function refreshStorefront() {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/products/[slug]', 'page');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/collections/[id]', 'page');
  revalidatePath('/admin');
}

async function resultWithData(): Promise<ActionResult> {
  return {ok: true, data: await loadAdminCatalogData()};
}

export async function refreshCatalogAction(): Promise<ActionResult> {
  try {
    await requireCatalogAdmin();
    return resultWithData();
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'Unable to load catalog.'};
  }
}

export async function updateCatalogEntityAction(input: {
  kind: 'template' | 'category' | 'collection';
  id: string;
  values: Record<string, unknown>;
}): Promise<ActionResult> {
  try {
    await requireCatalogAdmin();
    const admin = getSupabaseAdminClient();

    if (input.kind === 'template') {
      const status = String(input.values.status || '');
      if (!['Published', 'Draft', 'Archived'].includes(status)) throw new Error('Invalid template status.');
      const {error} = await admin.from('akl_products').update({status}).eq('id', input.id);
      if (error) throw error;
    }

    if (input.kind === 'category') {
      const payload: Record<string, unknown> = {};
      if (typeof input.values.name === 'string' && input.values.name.trim()) payload.name = input.values.name.trim();
      if (typeof input.values.description === 'string') payload.description = input.values.description.trim();
      if (typeof input.values.status === 'string' && ['Active', 'Hidden'].includes(input.values.status)) payload.status = input.values.status;
      if (!Object.keys(payload).length) throw new Error('No valid category changes supplied.');
      const {error} = await admin.from('akl_categories').update(payload).eq('id', input.id);
      if (error) throw error;
    }

    if (input.kind === 'collection') {
      const payload: Record<string, unknown> = {};
      if (typeof input.values.name === 'string' && input.values.name.trim()) payload.name = input.values.name.trim();
      if (typeof input.values.description === 'string') payload.description = input.values.description.trim();
      if (typeof input.values.status === 'string' && ['Published', 'Draft'].includes(input.values.status)) payload.status = input.values.status;
      if (!Object.keys(payload).length) throw new Error('No valid collection changes supplied.');
      const {error} = await admin.from('akl_collections').update(payload).eq('id', input.id);
      if (error) throw error;
    }

    refreshStorefront();
    return resultWithData();
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'Update failed.'};
  }
}

export async function assignCatalogMediaAction(input: {
  productSlug: string;
  mediaIds: string[];
  coverId: string;
}): Promise<ActionResult> {
  try {
    await requireCatalogAdmin();
    const productSlug = input.productSlug.trim();
    const mediaIds = [...new Set(input.mediaIds)];
    if (!productSlug || !mediaIds.length || !mediaIds.includes(input.coverId)) {
      throw new Error('Choose a template, at least one image, and one cover image.');
    }

    const admin = getSupabaseAdminClient();
    const [{data: product, error: productError}, {data: media, error: mediaError}] = await Promise.all([
      admin.from('akl_products').select('id,slug').eq('slug', productSlug).maybeSingle(),
      admin.from('akl_media_assets').select('id,asset_type,storage_path,public_url').in('id', mediaIds),
    ]);
    if (productError || mediaError) throw productError || mediaError;
    if (!product) throw new Error('Template not found.');
    if (!media || media.length !== mediaIds.length || media.some(item => !['Cover', 'Preview'].includes(item.asset_type))) {
      throw new Error('Only uploaded cover or preview images can be assigned.');
    }

    const updates = await Promise.all(media.map(item => admin.from('akl_media_assets').update({
      product_slug: productSlug,
      asset_type: item.id === input.coverId ? 'Cover' : 'Preview',
    }).eq('id', item.id)));
    const updateError = updates.find(item => item.error)?.error;
    if (updateError) throw updateError;

    const cover = media.find(item => item.id === input.coverId)!;
    const coverUrl = cover.public_url || admin.storage.from('akl-previews').getPublicUrl(cover.storage_path).data.publicUrl;
    const {error: coverError} = await admin.from('akl_products').update({cover_url: coverUrl, cover_name: cover.storage_path}).eq('slug', productSlug);
    if (coverError) throw coverError;

    refreshStorefront();
    return resultWithData();
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'Media assignment failed.'};
  }
}

export async function deleteCatalogEntityAction(input: {
  kind: 'template' | 'category' | 'collection' | 'media';
  id: string;
  cascade?: boolean;
}): Promise<ActionResult> {
  try {
    await requireCatalogAdmin();
    const admin = getSupabaseAdminClient();

    if (input.kind === 'category') {
      const {data: linked, error: linkedError} = await admin.from('akl_products').select('id').eq('category_id', input.id);
      if (linkedError) throw linkedError;
      if (linked?.length && !input.cascade) {
        return {ok: false, requiresCascade: true, error: `This category contains ${linked.length} template${linked.length === 1 ? '' : 's'}.`};
      }
      if (linked?.length) {
        const {error} = await admin.from('akl_products').delete().eq('category_id', input.id);
        if (error) throw error;
      }
      const {error} = await admin.from('akl_categories').delete().eq('id', input.id);
      if (error) throw error;
    }

    if (input.kind === 'collection') {
      const {error: unlinkError} = await admin.from('akl_products').update({collection_id: null}).eq('collection_id', input.id);
      if (unlinkError) throw unlinkError;
      const {error} = await admin.from('akl_collections').delete().eq('id', input.id);
      if (error) throw error;
    }

    if (input.kind === 'template') {
      const {data: product, error: readError} = await admin.from('akl_products').select('slug').eq('id', input.id).maybeSingle();
      if (readError) throw readError;
      if (product?.slug) {
        const {error} = await admin.from('akl_media_assets').update({product_slug: null}).eq('product_slug', product.slug);
        if (error) throw error;
      }
      const {error} = await admin.from('akl_products').delete().eq('id', input.id);
      if (error) throw error;
    }

    if (input.kind === 'media') {
      const {data: asset, error: readError} = await admin.from('akl_media_assets').select('storage_path,asset_type,product_slug,public_url').eq('id', input.id).maybeSingle();
      if (readError) throw readError;
      if (!asset) throw new Error('Media asset not found.');
      const bucket = asset.asset_type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
      if (asset.storage_path) {
        const {error} = await admin.storage.from(bucket).remove([asset.storage_path]);
        if (error) throw error;
      }
      const {error} = await admin.from('akl_media_assets').delete().eq('id', input.id);
      if (error) throw error;
      if (asset.product_slug && asset.public_url) {
        await admin.from('akl_products').update({cover_url: ''}).eq('slug', asset.product_slug).eq('cover_url', asset.public_url);
      }
    }

    refreshStorefront();
    return resultWithData();
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'Delete failed.'};
  }
}
