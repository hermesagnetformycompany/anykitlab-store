import {revalidatePath} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

function forbidden() {
  return NextResponse.json({error: 'Catalog administrator access is required.'}, {status: 403});
}

async function requireCatalogAdmin() {
  const user = await getVerifiedAdmin();
  if (!user || !['Owner', 'Catalog manager'].includes(user.role)) return null;
  return user;
}

function publicMediaUrl(storagePath: string, existing?: string | null) {
  if (existing) return existing;
  if (!storagePath) return '';
  return getSupabaseAdminClient().storage.from('akl-previews').getPublicUrl(storagePath).data.publicUrl;
}

function revalidateStorefront() {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/products/[slug]', 'page');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/collections/[id]', 'page');
}

export async function GET() {
  if (!(await requireCatalogAdmin())) return forbidden();
  const admin = getSupabaseAdminClient();
  const [productsResult, categoriesResult, collectionsResult, mediaResult] = await Promise.all([
    admin.from('akl_products').select('id,slug,title,status,category_id,collection_id,cover_url').order('title'),
    admin.from('akl_categories').select('id,slug,name,description,status').order('name'),
    admin.from('akl_collections').select('id,name,description,status,category_ids').order('name'),
    admin.from('akl_media_assets').select('id,name,asset_type,product_slug,storage_path,public_url,status').order('created_at', {ascending: false}),
  ]);
  const error = productsResult.error || categoriesResult.error || collectionsResult.error || mediaResult.error;
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({
    products: productsResult.data || [],
    categories: categoriesResult.data || [],
    collections: collectionsResult.data || [],
    media: (mediaResult.data || []).map(item => ({
      ...item,
      public_url: item.asset_type === 'Delivery' ? '' : publicMediaUrl(item.storage_path, item.public_url),
    })),
  });
}

export async function POST(request: NextRequest) {
  const actor = await requireCatalogAdmin();
  if (!actor) return forbidden();
  const body = await request.json() as {
    action?: string;
    productSlug?: string;
    mediaIds?: string[];
    coverId?: string;
  };
  if (body.action !== 'assign-media') return NextResponse.json({error: 'Unknown action.'}, {status: 400});

  const productSlug = String(body.productSlug || '').trim();
  const mediaIds = Array.isArray(body.mediaIds) ? [...new Set(body.mediaIds.map(String))] : [];
  const coverId = String(body.coverId || '');
  if (!productSlug || !mediaIds.length || !mediaIds.includes(coverId)) {
    return NextResponse.json({error: 'Choose a template, at least one image and one cover image.'}, {status: 400});
  }

  const admin = getSupabaseAdminClient();
  const [{data: product, error: productError}, {data: media, error: mediaError}] = await Promise.all([
    admin.from('akl_products').select('id,slug').eq('slug', productSlug).maybeSingle(),
    admin.from('akl_media_assets').select('id,asset_type,storage_path,public_url').in('id', mediaIds),
  ]);
  if (productError || mediaError) return NextResponse.json({error: (productError || mediaError)?.message}, {status: 500});
  if (!product) return NextResponse.json({error: 'Template not found.'}, {status: 404});
  if (!media || media.length !== mediaIds.length || media.some(item => !['Cover', 'Preview'].includes(item.asset_type))) {
    return NextResponse.json({error: 'Only uploaded cover or preview images can be assigned.'}, {status: 400});
  }

  for (const item of media) {
    const {error} = await admin.from('akl_media_assets').update({
      product_slug: productSlug,
      asset_type: item.id === coverId ? 'Cover' : 'Preview',
    }).eq('id', item.id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
  }

  const cover = media.find(item => item.id === coverId)!;
  const coverUrl = publicMediaUrl(cover.storage_path, cover.public_url);
  const {error: coverError} = await admin.from('akl_products').update({cover_url: coverUrl, cover_name: cover.storage_path}).eq('slug', productSlug);
  if (coverError) return NextResponse.json({error: coverError.message}, {status: 500});

  revalidateStorefront();
  return NextResponse.json({ok: true, assigned: mediaIds.length, coverUrl});
}

export async function DELETE(request: NextRequest) {
  if (!(await requireCatalogAdmin())) return forbidden();
  const body = await request.json() as {kind?: string; id?: string; cascade?: boolean};
  const kind = String(body.kind || '');
  const id = String(body.id || '');
  if (!id || !['category', 'collection', 'media', 'template'].includes(kind)) {
    return NextResponse.json({error: 'Invalid delete request.'}, {status: 400});
  }

  const admin = getSupabaseAdminClient();
  if (kind === 'category') {
    const {data: linked, error: linkedError} = await admin.from('akl_products').select('id').eq('category_id', id);
    if (linkedError) return NextResponse.json({error: linkedError.message}, {status: 500});
    if (linked?.length && !body.cascade) {
      return NextResponse.json({error: `This category contains ${linked.length} template${linked.length === 1 ? '' : 's'}. Delete or move them first, or confirm cascade deletion.`, requiresCascade: true}, {status: 409});
    }
    if (linked?.length) {
      const {error} = await admin.from('akl_products').delete().eq('category_id', id);
      if (error) return NextResponse.json({error: error.message}, {status: 500});
    }
    const {error} = await admin.from('akl_categories').delete().eq('id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
  }

  if (kind === 'collection') {
    const {error: unlinkError} = await admin.from('akl_products').update({collection_id: null}).eq('collection_id', id);
    if (unlinkError) return NextResponse.json({error: unlinkError.message}, {status: 500});
    const {error} = await admin.from('akl_collections').delete().eq('id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
  }

  if (kind === 'template') {
    const {data: product, error: readError} = await admin.from('akl_products').select('slug').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({error: readError.message}, {status: 500});
    if (product?.slug) await admin.from('akl_media_assets').update({product_slug: null}).eq('product_slug', product.slug);
    const {error} = await admin.from('akl_products').delete().eq('id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
  }

  if (kind === 'media') {
    const {data: asset, error: readError} = await admin.from('akl_media_assets').select('storage_path,asset_type,product_slug,public_url').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({error: readError.message}, {status: 500});
    if (!asset) return NextResponse.json({error: 'Media asset not found.'}, {status: 404});
    const bucket = asset.asset_type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
    if (asset.storage_path) await admin.storage.from(bucket).remove([asset.storage_path]);
    const {error} = await admin.from('akl_media_assets').delete().eq('id', id);
    if (error) return NextResponse.json({error: error.message}, {status: 500});
    if (asset.product_slug && asset.public_url) {
      await admin.from('akl_products').update({cover_url: ''}).eq('slug', asset.product_slug).eq('cover_url', asset.public_url);
    }
  }

  revalidateStorefront();
  return NextResponse.json({ok: true});
}
