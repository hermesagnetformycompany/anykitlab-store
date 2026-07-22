import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';
import {getSupabaseServerClient} from '@/lib/supabase/server';

type RouteContext = {params: Promise<{id: string}>};

type OrderItemRow = {product_slug: string; quantity: number};
type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total: number;
  payment_reference: string | null;
  status: 'Awaiting payment' | 'Pending verification' | 'Verified' | 'Access sent' | 'Rejected';
  created_at: string;
  akl_order_items?: OrderItemRow[];
};

function toCustomerOrder(row: OrderRow) {
  return {
    id: row.order_number,
    date: new Date(row.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
    total: row.total,
    status: row.status,
    reference: row.payment_reference || '',
    items: (row.akl_order_items || []).map(item => ({slug: item.product_slug, qty: item.quantity})),
    name: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone,
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await getSupabaseServerClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();
  if (authError || !user?.email) {
    return NextResponse.json({error: 'Sign in before submitting a payment reference.'}, {status: 401});
  }

  const {id} = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({error: 'Invalid order.'}, {status: 400});
  }

  const body = await request.json() as {reference?: string};
  const reference = body.reference?.trim().toUpperCase() || '';
  if (!/^[A-Z0-9-]{6,40}$/.test(reference)) {
    return NextResponse.json({error: 'Enter a valid UPI UTR or transaction reference.'}, {status: 400});
  }

  const admin = getSupabaseAdminClient();
  const selectColumns = 'id,order_number,customer_name,customer_email,customer_phone,total,payment_reference,status,created_at,akl_order_items(product_slug,quantity)';
  const {data: existing, error: readError} = await admin
    .from('akl_orders')
    .select(selectColumns)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readError) {
    console.error('Payment reference lookup failed:', readError.message);
    return NextResponse.json({error: 'We could not load this order. Please try again.'}, {status: 500});
  }
  if (!existing) return NextResponse.json({error: 'Order not found.'}, {status: 404});

  const current = existing as unknown as OrderRow;
  if (current.payment_reference) {
    if (current.payment_reference.toUpperCase() === reference) {
      return NextResponse.json({order: toCustomerOrder(current)}, {headers: {'Cache-Control': 'no-store'}});
    }
    return NextResponse.json({error: 'A different payment reference has already been submitted for this order.'}, {status: 409});
  }
  if (current.status !== 'Awaiting payment') {
    return NextResponse.json({error: `This order cannot accept a payment reference while it is ${current.status.toLowerCase()}.`}, {status: 409});
  }

  const {data: updated, error: updateError} = await admin
    .from('akl_orders')
    .update({payment_reference: reference, status: 'Pending verification', updated_at: new Date().toISOString()})
    .eq('id', id)
    .eq('user_id', user.id)
    .is('payment_reference', null)
    .select(selectColumns)
    .maybeSingle();

  if (updateError) {
    const code = (updateError as {code?: string}).code;
    if (code === '23505') {
      return NextResponse.json({error: 'This UPI reference is already attached to another order.'}, {status: 409});
    }
    console.error('Payment reference update failed:', updateError.message);
    return NextResponse.json({error: 'We could not submit the payment reference. Please try again.'}, {status: 500});
  }
  if (!updated) {
    return NextResponse.json({error: 'This order changed while you were submitting. Refresh and check its status.'}, {status: 409});
  }

  return NextResponse.json({order: toCustomerOrder(updated as unknown as OrderRow)}, {headers: {'Cache-Control': 'no-store'}});
}
