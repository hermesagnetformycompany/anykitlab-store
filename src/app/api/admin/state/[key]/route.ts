import {revalidatePath} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {toAdminRole, toDatabaseRole, type AdminRole} from '@/lib/admin-auth';
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

async function removeMissing(table: string, currentIds: string[], nextIds: string[]) {
  const admin = getSupabaseAdminClient();
  const missing = currentIds.filter(id => !nextIds.includes(id));
  if (missing.length) {
    // For categories, null out product references first to avoid FK constraint errors
    if (table === 'akl_categories') {
      const {error: updateError} = await admin.from('akl_products').update({category_id: null}).in('category_id', missing);
      if (updateError) {
        console.error(`Failed to null out category_id for products:`, updateError);
        throw new Error(`Unable to delete categories: products reference them`);
      }
    }
    // For collections, null out product references first to avoid FK constraint errors
    if (table === 'akl_collections') {
      const {error: updateError} = await admin.from('akl_products').update({collection_id: null}).in('collection_id', missing);
      if (updateError) {
        console.error(`Failed to null out collection_id for products:`, updateError);
        throw new Error(`Unable to delete collections: products reference them`);
      }
    }
    const {error} = await admin.from(table).delete().in('id', missing);
    if (error) {
      console.error(`Failed to delete from ${table}:`, error);
      throw error;
    }
  }
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{key: string}>}) {
  const adminUser = await getVerifiedAdmin();
  if (!adminUser) return forbidden();
  const {key} = await params;
  if (!allowedKeys.has(key)) return NextResponse.json({error: 'Unknown admin data set.'}, {status: 404});
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
      return NextResponse.json({value: (data || []).map(row => ({id: row.id, name: row.name, type: row.asset_type, linkedTo: row.product_slug || 'Shared library', status: row.status, storagePath: row.storage_path, publicUrl: row.public_url || ''}))});
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
        return [{id: profile.id, name: profile.full_name || email, email, loginId: email, temporaryPassword: '', role, status: profile.status === 'active' ? 'Active' : 'Invited'}];
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
  const body = await request.json() as {value?: unknown};
  const admin = getSupabaseAdminClient();

  try {
    if (key === 'templates') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      const rows = value.map(item => ({
        id: String(item.id), slug: String(item.slug), title: String(item.title), category_id: item.categoryId ? String(item.categoryId) : null,
        collection_id: item.collectionId ? String(item.collectionId) : null, price: Number(item.price), mrp: Number(item.mrp),
        layout_count: Number(item.layoutCount), description: String(item.description || ''), long_description: String(item.long || item.description || ''),
        accent: String(item.accent || '#f0642f'), dark: String(item.dark || '#191917'), badge: String(item.badge || ''),
        status: String(item.status), formats: Array.isArray(item.formats) ? item.formats : [], includes: Array.isArray(item.includes) ? item.includes : [],
        cover_name: String(item.coverName || ''), delivery_name: String(item.deliveryName || ''),
        cover_url: String(item.coverUrl || ''),
      }));
      const {data: current} = await admin.from('akl_products').select('id');
      if (rows.length) { const {error} = await admin.from('akl_products').upsert(rows); if (error) throw error; }
      await removeMissing('akl_products', (current || []).map(item => item.id), rows.map(item => item.id));
      revalidatePath('/', 'layout');
    } else if (key === 'categories') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      const rows = value.map(item => ({id: String(item.id), slug: String(item.slug), name: String(item.name), description: String(item.description || ''), status: String(item.status), product_count: Number(item.productCount || 0), image_url: String(item.imageUrl || '')}));
      const {data: current} = await admin.from('akl_categories').select('id');
      if (rows.length) { const {error} = await admin.from('akl_categories').upsert(rows); if (error) throw error; }
      await removeMissing('akl_categories', (current || []).map(item => item.id), rows.map(item => item.id));
      revalidatePath('/', 'layout');
    } else if (key === 'collections') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      const rows = value.map(item => ({id: String(item.id), name: String(item.name), description: String(item.description || ''), status: String(item.status), category_ids: Array.isArray(item.categoryIds) ? item.categoryIds : [], image_url: String(item.imageUrl || '')}));
      const {data: current} = await admin.from('akl_collections').select('id');
      if (rows.length) { const {error} = await admin.from('akl_collections').upsert(rows); if (error) throw error; }
      await removeMissing('akl_collections', (current || []).map(item => item.id), rows.map(item => item.id));
      revalidatePath('/', 'layout');
    } else if (key === 'media') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      const rows = value.map(item => ({id: String(item.id), name: String(item.name), asset_type: String(item.type), product_slug: item.linkedTo && item.linkedTo !== 'Unassigned' && item.linkedTo !== 'Shared library' ? String(item.linkedTo) : null, storage_path: String(item.storagePath || ''), public_url: String(item.publicUrl || ''), status: String(item.status)}));
      const {data: current} = await admin.from('akl_media_assets').select('id');
      if (rows.length) { const {error} = await admin.from('akl_media_assets').upsert(rows); if (error) throw error; }
      await removeMissing('akl_media_assets', (current || []).map(item => item.id), rows.map(item => item.id));
    } else if (key === 'orders') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      for (const item of value) {
        const orderNumber = String(item.id);
        const status = String(item.status);
        const {data: order, error} = await admin.from('akl_orders').update({status}).eq('order_number', orderNumber).select('id,user_id').maybeSingle();
        if (error) throw error;
        if (order?.user_id && status === 'Access sent') {
          const {data: orderItems} = await admin.from('akl_order_items').select('product_id').eq('order_id', order.id);
          const grants = (orderItems || []).flatMap(orderItem => orderItem.product_id ? [{user_id: order.user_id, product_id: orderItem.product_id, order_id: order.id}] : []);
          if (grants.length) { const {error: grantError} = await admin.from('akl_product_access').upsert(grants); if (grantError) throw grantError; }
        }
      }
    } else if (key === 'team') {
      const value = Array.isArray(body.value) ? body.value as Record<string, unknown>[] : [];
      const submittedIds: string[] = [];
      for (const item of value) {
        const email = String(item.email || '').trim().toLowerCase();
        const role = toDatabaseRole(String(item.role) as AdminRole);
        const status = item.status === 'Active' ? 'active' : 'invited';
        const id = String(item.id || '');
        if (/^[0-9a-f-]{36}$/i.test(id)) {
          submittedIds.push(id);
          const {error} = await admin.from('akl_profiles').update({full_name: String(item.name || ''), role, status}).eq('id', id);
          if (error) throw error;
        } else {
          const password = String(item.temporaryPassword || '');
          if (!email || password.length < 8) throw new Error('A valid email and temporary password are required for new staff.');
          const {data: created, error} = await admin.auth.admin.createUser({email, password, email_confirm: true, app_metadata: {site: 'anykitlab', role}, user_metadata: {site: 'anykitlab', full_name: String(item.name || '')}});
          if (error) throw error;
          submittedIds.push(created.user.id);
          const {error: profileError} = await admin.from('akl_profiles').upsert({id: created.user.id, full_name: String(item.name || ''), role, status});
          if (profileError) throw profileError;
        }
      }
      const {data: existing} = await admin.from('akl_profiles').select('id,role').neq('role', 'customer');
      const removable = (existing || []).filter(profile => profile.role !== 'owner' && !submittedIds.includes(profile.id)).map(profile => profile.id);
      if (removable.length) await admin.from('akl_profiles').update({status: 'suspended'}).in('id', removable);
    } else if (key === 'settings') {
      const item = (body.value || {}) as Record<string, unknown>;
      const {error} = await admin.from('akl_site_settings').upsert({id: 'storefront', store_name: String(item.storeName || 'AnyKit Lab'), support_email: String(item.supportEmail || ''), upi_id: String(item.upiId || ''), verification_sla: String(item.verificationSla || ''), sender_name: String(item.senderName || ''), hero_image_1: String(item.heroImage1 || ''), hero_image_2: String(item.heroImage2 || ''), hero_image_3: String(item.heroImage3 || '')});
      if (error) throw error;
    }
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error(`Admin ${key} write failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to save administrator data.'}, {status: 500});
  }
}
