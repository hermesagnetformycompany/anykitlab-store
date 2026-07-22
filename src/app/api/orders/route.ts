import {NextResponse, type NextRequest} from 'next/server';
import QRCode from 'qrcode';
import {buildUpiPaymentUri, CheckoutInputError, isValidUpiId} from '@/lib/checkout-core';
import {CheckoutAvailabilityError, createCheckoutQuote} from '@/lib/checkout-server';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';
import {getSupabaseServerClient} from '@/lib/supabase/server';

type IntentItem = {product_slug: string; product_title: string; unit_price: number; quantity: number};
type IntentOrder = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  akl_order_items?: IntentItem[];
};

async function intentResponse(order: IntentOrder, items: IntentItem[], upiId: string, payeeName: string, status: 200 | 201) {
  const uri = buildUpiPaymentUri({
    upiId,
    payeeName,
    amount: order.total,
    transactionReference: order.order_number,
    note: `${payeeName} order ${order.order_number}`,
  });
  const qrDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: {dark: '#171714', light: '#ffffff'},
  });

  return NextResponse.json({
    paymentIntent: {
      id: order.id,
      orderNumber: order.order_number,
      total: order.total,
      status: order.status,
      upiId,
      payeeName,
      reference: order.order_number,
      uri,
      qrDataUrl,
      createdAt: order.created_at,
      items: items.map(item => ({
        slug: item.product_slug,
        title: item.product_title,
        qty: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.unit_price * item.quantity,
      })),
    },
  }, {status, headers: {'Cache-Control': 'no-store'}});
}

function closedIntentResponse() {
  return NextResponse.json({
    error: 'This payment request is no longer payable. Start a new checkout.',
    code: 'CHECKOUT_KEY_CLOSED',
  }, {status: 409, headers: {'Cache-Control': 'no-store'}});
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({error: 'Sign in before creating a payment request.'}, {status: 401});
    }

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      items?: unknown;
      checkoutKey?: string;
    };
    const name = body.name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const phone = body.phone?.trim() || '';
    if (!name || !email || !phone) {
      return NextResponse.json({error: 'Complete your name, email, and phone number.'}, {status: 400});
    }
    if (email !== user.email.toLowerCase()) {
      return NextResponse.json({error: 'Use the email address attached to your signed-in account.'}, {status: 403});
    }
    const checkoutKey = body.checkoutKey?.trim() || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutKey)) {
      return NextResponse.json({error: 'Invalid checkout request. Refresh and try again.'}, {status: 400});
    }

    const admin = getSupabaseAdminClient();
    const {data: settings, error: settingsError} = await admin
      .from('akl_site_settings')
      .select('store_name,upi_id')
      .eq('id', 'storefront')
      .maybeSingle();
    if (settingsError || !settings) throw settingsError || new Error('Store payment settings are unavailable.');

    const upiId = String(settings.upi_id || '').trim();
    const payeeName = String(settings.store_name || 'AnyKit Lab').trim();
    if (!isValidUpiId(upiId)) {
      return NextResponse.json({error: 'UPI checkout is temporarily unavailable. Contact support if this continues.'}, {status: 503});
    }

    const existingColumns = 'id,order_number,total,status,created_at,akl_order_items(product_slug,product_title,unit_price,quantity)';
    const {data: existing, error: existingError} = await admin
      .from('akl_orders')
      .select(existingColumns)
      .eq('user_id', user.id)
      .eq('checkout_key', checkoutKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      const order = existing as unknown as IntentOrder;
      if (order.status !== 'Awaiting payment') return closedIntentResponse();
      return intentResponse(order, order.akl_order_items || [], upiId, payeeName, 200);
    }

    const quote = await createCheckoutQuote(body.items);

    const intentItems = quote.items.map(item => ({
      product_id: item.id,
      product_slug: item.slug,
      product_title: item.title,
      unit_price: item.price,
      quantity: item.qty,
    }));
    const {data: intentRows, error: intentError} = await admin.rpc('akl_create_payment_intent', {
      p_user_id: user.id,
      p_customer_name: name,
      p_customer_email: email,
      p_customer_phone: phone,
      p_total: quote.total,
      p_checkout_key: checkoutKey,
      p_items: intentItems,
    });
    const intentRow = (Array.isArray(intentRows) ? intentRows[0] : intentRows) as (IntentOrder & {created?: boolean}) | null;
    if (intentError || !intentRow) throw intentError || new Error('Unable to create the order payment request.');

    if (!intentRow.created) {
      const {data: concurrent, error: concurrentError} = await admin
        .from('akl_orders')
        .select(existingColumns)
        .eq('user_id', user.id)
        .eq('checkout_key', checkoutKey)
        .maybeSingle();
      if (concurrentError || !concurrent) throw concurrentError || new Error('Unable to recover the existing payment request.');
      const concurrentOrder = concurrent as unknown as IntentOrder;
      if (concurrentOrder.status !== 'Awaiting payment') return closedIntentResponse();
      return intentResponse(concurrentOrder, concurrentOrder.akl_order_items || [], upiId, payeeName, 200);
    }

    return intentResponse(intentRow, intentItems, upiId, payeeName, 201);
  } catch (error) {
    if (error instanceof CheckoutInputError) {
      return NextResponse.json({error: error.message}, {status: 400});
    }
    if (error instanceof CheckoutAvailabilityError) {
      return NextResponse.json({error: error.message}, {status: 409});
    }
    console.error('Payment intent creation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({error: 'We could not create the secure payment request. Please try again.'}, {status: 500});
  }
}
