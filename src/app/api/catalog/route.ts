import {NextResponse} from 'next/server';
import {getCatalogData} from '@/lib/catalog';

export async function GET() {
  const catalog = await getCatalogData();
  return NextResponse.json(catalog, {
    headers: {'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'},
  });
}
