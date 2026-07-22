import {revalidatePath} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {canAccessAdminTab} from '@/lib/admin-auth';
import {mapCatalogRow, type CatalogResource} from '@/lib/admin-catalog-validation';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

type RouteContext = {params: Promise<{resource: string; id: string}>};

const resourceConfig: Record<CatalogResource, {table: string; tab: string}> = {
  products: {table: 'akl_products', tab: 'Templates'},
  categories: {table: 'akl_categories', tab: 'Categories'},
  collections: {table: 'akl_collections', tab: 'Collections'},
};

function isCatalogResource(value: string): value is CatalogResource {
  return value in resourceConfig;
}

async function authorize(resource: string) {
  if (!isCatalogResource(resource)) {
    return {error: NextResponse.json({error: 'Unknown catalog resource.'}, {status: 404})};
  }
  const adminUser = await getVerifiedAdmin();
  if (!adminUser) {
    return {error: NextResponse.json({error: 'Administrator authentication required.'}, {status: 401})};
  }
  const config = resourceConfig[resource];
  if (!canAccessAdminTab(adminUser.role, config.tab)) {
    return {error: NextResponse.json({error: 'Your role cannot manage this catalog resource.'}, {status: 403})};
  }
  return {resource, config};
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const {resource: rawResource, id} = await context.params;
  const authorization = await authorize(rawResource);
  if ('error' in authorization) return authorization.error;
  const {resource, config} = authorization;

  try {
    const body = await request.json() as {item?: Record<string, unknown>};
    if (!body.item || typeof body.item !== 'object') {
      return NextResponse.json({error: 'Catalog item is required.'}, {status: 400});
    }
    const row = mapCatalogRow(resource, id, body.item);
    const admin = getSupabaseAdminClient();
    const {error} = await admin.from(config.table).upsert(row as never);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return NextResponse.json({ok: true});
  } catch (error) {
    const code = (error as {code?: string}).code;
    if (code === '23505') {
      return NextResponse.json({error: 'That ID or slug is already in use.'}, {status: 409});
    }
    if (code === '23503') {
      return NextResponse.json({error: 'Choose a category or collection that still exists.'}, {status: 409});
    }
    const message = error instanceof Error ? error.message : 'Unable to save the catalog item.';
    console.error(`Catalog ${resource} save failed:`, message);
    const isInputError = message.endsWith('required.')
      || message.endsWith('is invalid.')
      || message.startsWith('Invalid')
      || message.startsWith('Use a lowercase')
      || message.includes('must')
      || message.includes('cannot')
      || message.includes('too long')
      || message.includes('too many');
    return NextResponse.json({error: message}, {status: isInputError ? 400 : 500});
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const {resource: rawResource, id} = await context.params;
  const authorization = await authorize(rawResource);
  if ('error' in authorization) return authorization.error;
  const {resource, config} = authorization;

  const admin = getSupabaseAdminClient();
  const {data, error} = await admin.from(config.table).delete().eq('id', id).select('id').maybeSingle();
  if (error) {
    console.error(`Catalog ${resource} delete failed:`, error.message);
    return NextResponse.json({error: 'Unable to delete this catalog item.'}, {status: 500});
  }
  if (!data) return NextResponse.json({error: 'Catalog item not found.'}, {status: 404});
  revalidatePath('/', 'layout');
  return NextResponse.json({ok: true});
}
