import {revalidatePath} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {parseMediaAssignmentInput} from '@/lib/admin-media';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

function forbidden() {
  return NextResponse.json({error: 'Catalog administrator access is required.'}, {status: 403});
}

function refreshStorefront() {
  revalidatePath('/', 'layout');
  revalidatePath('/shop');
  revalidatePath('/products/[slug]', 'page');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/collections/[id]', 'page');
  revalidatePath('/admin');
}

async function requireCatalogAdmin() {
  const adminUser = await getVerifiedAdmin();
  return adminUser && ['Owner', 'Catalog manager'].includes(adminUser.role) ? adminUser : null;
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!await requireCatalogAdmin()) return forbidden();
  const {id} = await params;

  try {
    const input = parseMediaAssignmentInput(await request.json());
    const admin = getSupabaseAdminClient();
    const {data: asset, error: assetError} = await admin
      .from('akl_media_assets')
      .select('id,name,asset_type,storage_path,public_url')
      .eq('id', id)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({error: 'Media asset not found.'}, {status: 404});
    if (!asset.public_url || !['Cover', 'Preview'].includes(asset.asset_type)) {
      return NextResponse.json({error: 'Only uploaded cover or preview images can be assigned.'}, {status: 400});
    }

    if (input.target === 'product-cover' || input.target === 'product-preview') {
      const {data: product, error: productError} = await admin
        .from('akl_products')
        .select('id,slug')
        .eq('id', input.targetId)
        .maybeSingle();
      if (productError) throw productError;
      if (!product) return NextResponse.json({error: 'Template not found.'}, {status: 404});

      if (input.target === 'product-cover') {
        const {error} = await admin.from('akl_products').update({
          cover_url: asset.public_url,
          cover_name: asset.storage_path,
        }).eq('id', product.id);
        if (error) throw error;
      }
      const {error} = await admin.from('akl_media_assets').update({
        product_slug: product.slug,
        asset_type: input.target === 'product-cover' ? 'Cover' : 'Preview',
      }).eq('id', id);
      if (error) throw error;
    } else if (input.target === 'category') {
      const {data, error} = await admin.from('akl_categories').update({image_url: asset.public_url}).eq('id', input.targetId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({error: 'Category not found.'}, {status: 404});
    } else if (input.target === 'collection') {
      const {data, error} = await admin.from('akl_collections').update({image_url: asset.public_url}).eq('id', input.targetId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({error: 'Collection not found.'}, {status: 404});
    } else {
      const column = input.target === 'hero-1' ? 'hero_image_1' : input.target === 'hero-2' ? 'hero_image_2' : 'hero_image_3';
      const {error} = await admin.from('akl_site_settings').update({[column]: asset.public_url}).eq('id', 'storefront');
      if (error) throw error;
    }

    refreshStorefront();
    return NextResponse.json({ok: true, publicUrl: asset.public_url});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to assign the image.';
    const status = /required|invalid|unsupported|choose|too long/i.test(message) ? 400 : 500;
    console.error('Admin media assignment failed:', message);
    return NextResponse.json({error: message}, {status});
  }
}

export async function DELETE(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  if (!await requireCatalogAdmin()) return forbidden();
  const {id} = await params;

  try {
    const admin = getSupabaseAdminClient();
    const {data: asset, error: assetError} = await admin
      .from('akl_media_assets')
      .select('id,asset_type,storage_path,public_url')
      .eq('id', id)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({error: 'Media asset not found.'}, {status: 404});

    if (asset.public_url) {
      const cleanup = await Promise.all([
        admin.from('akl_products').update({cover_url: '', cover_name: ''}).eq('cover_url', asset.public_url),
        admin.from('akl_categories').update({image_url: ''}).eq('image_url', asset.public_url),
        admin.from('akl_collections').update({image_url: ''}).eq('image_url', asset.public_url),
        admin.from('akl_site_settings').select('hero_image_1,hero_image_2,hero_image_3').eq('id', 'storefront').maybeSingle(),
      ]);
      const cleanupError = cleanup.slice(0, 3).find(result => result.error)?.error;
      if (cleanupError) throw cleanupError;
      const settings = cleanup[3].data;
      if (settings) {
        const updates: Record<string, string> = {};
        if (settings.hero_image_1 === asset.public_url) updates.hero_image_1 = '';
        if (settings.hero_image_2 === asset.public_url) updates.hero_image_2 = '';
        if (settings.hero_image_3 === asset.public_url) updates.hero_image_3 = '';
        if (Object.keys(updates).length) {
          const {error} = await admin.from('akl_site_settings').update(updates).eq('id', 'storefront');
          if (error) throw error;
        }
      }
    }

    const {error: deleteError} = await admin.from('akl_media_assets').delete().eq('id', id);
    if (deleteError) throw deleteError;
    const bucket = asset.asset_type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
    let storageCleanupPending = false;
    if (asset.storage_path) {
      const {error: storageError} = await admin.storage.from(bucket).remove([asset.storage_path]);
      if (storageError) {
        storageCleanupPending = true;
        console.error('Admin media storage cleanup failed:', storageError.message);
      }
    }

    refreshStorefront();
    return NextResponse.json({ok: true, storageCleanupPending});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete the media asset.';
    console.error('Admin media deletion failed:', message);
    return NextResponse.json({error: message}, {status: 500});
  }
}
