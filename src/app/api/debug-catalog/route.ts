import {NextResponse} from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasConfig = Boolean(url && key);

  if (!hasConfig) {
    return NextResponse.json({
      error: 'Missing env vars',
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
      urlPrefix: url ? url.substring(0, 30) + '...' : null,
      keyPrefix: key ? key.substring(0, 20) + '...' : null,
    });
  }

  try {
    const {createClient} = await import('@supabase/supabase-js');
    const supabase = createClient(url, key, {
      auth: {autoRefreshToken: false, persistSession: false},
    });

    const [catResult, prodResult, colResult] = await Promise.all([
      supabase.from('akl_categories').select('id,slug,name,status').order('name'),
      supabase.from('akl_products').select('id,slug,title,status').order('created_at'),
      supabase.from('akl_collections').select('id,name,status').order('name'),
    ]);

    return NextResponse.json({
      hasConfig,
      urlPrefix: url.substring(0, 30) + '...',
      categories: {
        count: catResult.data?.length || 0,
        error: catResult.error?.message || null,
        data: catResult.data,
      },
      products: {
        count: prodResult.data?.length || 0,
        error: prodResult.error?.message || null,
        data: prodResult.data,
      },
      collections: {
        count: colResult.data?.length || 0,
        error: colResult.error?.message || null,
        data: colResult.data,
      },
    });
  } catch (error) {
    return NextResponse.json({
      hasConfig,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}