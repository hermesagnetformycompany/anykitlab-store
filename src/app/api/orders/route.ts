import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';
import {getSupabaseServerClient} from '@/lib/supabase/server';

type CheckoutItem = {slug: string; qty: number};

type RateEntry = {count: number; resetAt: number};
const rateLimit = new Map<string, RateEntry>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

function clientKey(request: NextRequest, userId: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `${userId}:${forwarded || 'unknown'}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, {count: 1, resetAt: now + RATE_WINDOW_MS});
    return false;
  }
  current.count += 1;
  rateLimit.set(key, current);
  return current.count > RATE_MAX;
}

export async function POST(request: NextRequest) {
  try {
    const serverClient = await getSupabaseServerClient();
    const {data: {user}, error: userError} = await serverClient.auth.getUser();
    if (userError || !user?.id || !user.email) {
      return NextResponse.json({error: 'Sign in to submit an order and receive account access.'}, {status: 401});
    }
    if (isRateLimited(clientKey(request, user.id))) {
      return NextResponse.json({error: 'Too many order attempts. Please wait before trying again.'}, {status: 429, headers: {'Retry-After': '600'}});
    }

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      reference?: string;
      items?: CheckoutItem[];
    };
    const name = body.name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const phone = body.phone?.trim() || '';
    const reference = body.reference?.trim().toUpperCase() || '';
    const items = Array.isArray(body.items) ? body.items : [];

    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 7) {
      return NextResponse.json({error: 'Enter a valid name, email address, and phone number.'}, {status: 400});
    }
    if (email !== user.email.toLowerCase()) {
      return NextResponse.json({error: 'Use the email address connected to your signed-in account.'}, {status: 400});
    }
    if (!/^[A-Z0-9-]{6,40}$/.test(reference)) {
      return NextResponse.json({error: 'Enter a valid payment transaction reference.'}, {status: 400});
    }
    if (!items.length || items.length > 20 || items.some(item => !item.slug || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)) {
      return NextResponse.json({error: 'The cart contains invalid items.'}, {status: 400});
    }

    const admin = getSupabaseAdminClient();
    const slugs = [...new Set(items.map(item => item.slug))];
    const {data: products, error: productError} = await admin
      .from('akl_products')
      .select('id,slug,title,price,status')
      .in('slug', slugs)
      .eq('status', 'Published');
    if (productError) throw productError;
    if (!products || products.length !== slugs.length) {
      return NextResponse.json({error: 'One or more products are no longer available.'}, {status: 409});
    }

    const productsBySlug = new Map(products.map(product => [product.slug, product]));
    const total = items.reduce((sum, item) => sum + productsBySlug.get(item.slug)!.price * item.qty, 0);
    const {data: order, error: orderError} = await admin.from('akl_orders').insert({
      user_id: user.id,
      customer_name: name,
      customer_email: user.email.toLowerCase(),
      customer_phone: phone,
      total,
      payment_reference: reference,
      payment_method: 'UPI',
    }).select('id,order_number,created_at,status').single();

    if (orderError) {
      if (orderError.code === '23505') return NextResponse.json({error: 'That payment reference has already been submitted.'}, {status: 409});
      throw orderError;
    }

    const orderItems = items.map(item => {
      const product = productsBySlug.get(item.slug)!;
      return {order_id: order.id, product_id: product.id, product_slug: product.slug, product_title: product.title, unit_price: product.price, quantity: item.qty};
    });
    const {error: itemError} = await admin.from('akl_order_items').insert(orderItems);
    if (itemError) {
      await admin.from('akl_orders').delete().eq('id', order.id);
      throw itemError;
    }

    return NextResponse.json({
      order: {
        id: order.order_number,
        date: new Date(order.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
        total,
        status: order.status,
        reference,
        items,
        name,
        email: user.email.toLowerCase(),
        phone,
      },
    }, {status: 201});
  } catch (error) {
    console.error('Order creation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({error: 'We could not submit the order. Please try again.'}, {status: 500});
  }
}
