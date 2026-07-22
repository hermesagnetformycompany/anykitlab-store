import {revalidatePath} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {toAdminRole, type AdminRole} from '@/lib/admin-auth';
import {toAdminMedia} from '@/lib/admin-media';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

const allowedKeys = new Set(['templates', 'categories', 'collections', 'media', 'orders', 'team', 'settings']);

function forbidden() {
  return NextResponse.json({error: 'Administrator access is required.'}, {status: 403});
}
function canWrite(role: AdminRole, key: string) {
  if (role === 'Owner') return true;
  if (role === 'Catalog manager') return ['templates', 'categories', 'collections', 'media'].includes(key);
  if (role === 'Payment reviewer') return key === 'orders';
  return false;
}
function canRead(role: AdminRole, key: string) {
  if (role === 'Owner') return true;
  if (role === 'Catalog manager') return ['templates', 'categories', 'collections', 'media'].includes(key);
  if (role === 'Payment reviewer' || role === 'Support') return key === 'orders';
  return false;
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{key: string}>}) {
  const adminUser = await getVerifiedAdmin();
  if (!adminUser) return forbidden();
  const {key} = await params;
  if (!allowedKeys.has(key)) return NextResponse.json({error: 'Unknown admin data set.'}, {status: 404});
  if (!canRead(adminUser.role, key)) return forbidden();
  const admin = getSupabaseAdminClient();

  try {
    if (key === 'templates') {
      const [{data: rows, error}, {data: categoryRows}] = await Promise.all([
        admin.from('akl_products').select('*').order('created_at'),
        admin.from('akl_categories').select('id,name'),
      ]);
      if (error) throw error;
      const categoryNames = new Map((categoryRows || []).map(row => [row.id, row.name]));
      return NextResponse.json({value: (rows || []).map(row => ({
        id: row.id, slug: row.slug, title: row.title, categoryId: row.category_id || '',
        category: categoryNames.get(row.category_id) || 'Uncategorised', collectionId: row.collection_id || '',
        price: row.price, mrp: row.mrp, layoutCount: row.layout_count, count: `${row.layout_count}+ layouts`,
        description: row.description, long: row.long_description, accent: row.accent, dark: row.dark,
        badge: row.badge, status: row.status, formats: row.formats || [], includes: row.includes || [],
        updatedAt: new Date(row.updated_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
        coverName: row.cover_name || '', deliveryName: row.delivery_name || '',
        coverUrl: row.cover_url || '',
      }))});
    }

    if (key === 'categories') {
      const {data, error} = await admin.from('akl_categories').select('*').order('name');
      if (error) throw error;
      return NextResponse.json({value: (data || []).map(row => ({id: row.id, slug: row.slug, name: row.name, description: row.description, status: row.status, productCount: row.product_count, imageUrl: row.image_url || ''}))});
    }

    if (key === 'collections') {
      const {data, error} = await admin.from('akl_collections').select('*').order('name');
      if (error) throw error;
      return NextResponse.json({value: (data || []).map(row => ({id: row.id, name: row.name, description: row.description, status: row.status, categoryIds: row.category_ids || [], imageUrl: row.image_url || ''}))});
    }

    if (key === 'media') {
      const {data, error} = await admin.from('akl_media_assets').select('*').order('created_at', {ascending: false});
      if (error) throw error;
      return NextResponse.json({value: (data || []).map(row => toAdminMedia(row))});
    }

    if (key === 'orders') {
      const {data, error} = await admin.from('akl_orders').select('order_number,customer_name,customer_email,total,payment_reference,status,created_at,akl_order_items(quantity)').order('created_at', {ascending: false});
      if (error) throw error;
      return NextResponse.json({value: (data || []).map(row => ({
        id: row.order_number,
        date: new Date(row.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
        name: row.customer_name, email: row.customer_email, total: row.total, reference: row.payment_reference,
        items: (row.akl_order_items || []).reduce((sum: number, item: {quantity: number}) => sum + item.quantity, 0),
        status: row.status,
      }))});
    }

    if (key === 'team') {
      const [{data: profiles, error}, usersResult] = await Promise.all([
        admin.from('akl_profiles').select('id,full_name,role,status').neq('role', 'customer').order('created_at'),
        admin.auth.admin.listUsers({page: 1, perPage: 1000}),
      ]);
      if (error || usersResult.error) throw error || usersResult.error;
      const emails = new Map(usersResult.data.users.map(user => [user.id, user.email || '']));
      return NextResponse.json({value: (profiles || []).flatMap(profile => {
        const role = toAdminRole(profile.role);
        if (!role) return [];
        const email = emails.get(profile.id) || '';
        const status = profile.status === 'active' ? 'Active' : profile.status === 'suspended' ? 'Suspended' : 'Invited';
        return [{id: profile.id, name: profile.full_name || email, email, loginId: email, temporaryPassword: '', role, status}];
      })});
    }

    const {data, error} = await admin.from('akl_site_settings').select('*').eq('id', 'storefront').single();
    if (error) throw error;
    return NextResponse.json({value: {storeName: data.store_name, supportEmail: data.support_email, upiId: data.upi_id, verificationSla: data.verification_sla, senderName: data.sender_name, heroImage1: data.hero_image_1 || '', heroImage2: data.hero_image_2 || '', heroImage3: data.hero_image_3 || ''}});
  } catch (error) {
    console.error(`Admin ${key} read failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({error: 'Unable to load administrator data.'}, {status: 500});
  }
}

export async function PUT(request: NextRequest, {params}: {params: Promise<{key: string}>}) {
  const adminUser = await getVerifiedAdmin();
  if (!adminUser) return forbidden();
  const {key} = await params;
  if (!allowedKeys.has(key)) return NextResponse.json({error: 'Unknown admin data set.'}, {status: 404});
  if (!canWrite(adminUser.role, key)) return forbidden();
  if (['templates', 'categories', 'collections', 'media', 'orders', 'team'].includes(key)) {
    return NextResponse.json({error: 'Bulk writes are disabled. Use the validated resource mutation endpoint.'}, {status: 405});
  }
  const body = await request.json() as {value?: unknown};
  const admin = getSupabaseAdminClient();

  try {
    const item = (body.value || {}) as Record<string, unknown>;
    const {error} = await admin.from('akl_site_settings').upsert({
      id: 'storefront',
      store_name: String(item.storeName || 'AnyKit Lab'),
      support_email: String(item.supportEmail || ''),
      upi_id: String(item.upiId || ''),
      verification_sla: String(item.verificationSla || ''),
      sender_name: String(item.senderName || ''),
      hero_image_1: String(item.heroImage1 || ''),
      hero_image_2: String(item.heroImage2 || ''),
      hero_image_3: String(item.heroImage3 || ''),
    });
    if (error) throw error;
    revalidatePath('/', 'layout');
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('Admin settings write failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to save administrator settings.'}, {status: 500});
  }
}