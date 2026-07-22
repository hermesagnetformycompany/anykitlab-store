import {randomUUID} from 'node:crypto';
import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {parseMediaCreateInput, toAdminMedia} from '@/lib/admin-media';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

function forbidden() {
  return NextResponse.json({error: 'Catalog administrator access is required.'}, {status: 403});
}

export async function POST(request: NextRequest) {
  const adminUser = await getVerifiedAdmin();
  if (!adminUser || !['Owner', 'Catalog manager'].includes(adminUser.role)) return forbidden();

  try {
    const input = parseMediaCreateInput(await request.json());
    const id = `med-${randomUUID()}`;
    const admin = getSupabaseAdminClient();
    const bucket = input.type === 'Delivery' ? 'akl-deliveries' : 'akl-previews';
    const pathParts = input.storagePath.split('/');
    const fileName = pathParts.pop() || '';
    const folder = pathParts.join('/');
    const {data: storedObjects, error: storageError} = await admin.storage.from(bucket).list(folder, {search: fileName, limit: 20});
    if (storageError) throw storageError;
    if (!storedObjects?.some(object => object.name === fileName)) {
      return NextResponse.json({error: 'The uploaded storage object could not be verified.'}, {status: 400});
    }
    const publicUrl = input.type === 'Delivery' ? '' : admin.storage.from(bucket).getPublicUrl(input.storagePath).data.publicUrl;
    const {data, error} = await admin.from('akl_media_assets').insert({
      id,
      name: input.name,
      asset_type: input.type,
      product_slug: null,
      storage_path: input.storagePath,
      public_url: publicUrl,
      status: 'Ready',
    }).select('*').single();
    if (error || !data) throw error || new Error('The uploaded file could not be registered.');
    return NextResponse.json({asset: toAdminMedia(data)}, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register the uploaded asset.';
    const status = /required|invalid|unsupported|too long/i.test(message) ? 400 : 500;
    console.error('Admin media registration failed:', message);
    return NextResponse.json({error: message}, {status});
  }
}
