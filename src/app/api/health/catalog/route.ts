import {NextResponse} from 'next/server';
import {getCatalogData} from '@/lib/catalog';
import {hasSupabaseConfig} from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasConfig = hasSupabaseConfig();
  try {
    const catalog = await getCatalogData();
    return NextResponse.json({
      status: 'ok',
      source: catalog.source,
      supabaseConfigured: hasConfig,
      counts: {
        categories: catalog.categories.length,
        collections: catalog.collections.length,
        products: catalog.products.length,
      },
      categories: catalog.categories.map(c => ({id: c.id, slug: c.slug, name: c.name, status: c.status})),
      collections: catalog.collections.map(c => ({id: c.id, name: c.name, status: c.status})),
      productSlugs: catalog.products.map(p => p.slug),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      supabaseConfigured: hasConfig,
    }, {status: 500});
  }
}