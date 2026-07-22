import {NextResponse, type NextRequest} from 'next/server';
import {canManageOrderStatus} from '@/lib/admin-auth';
import {getVerifiedAdmin} from '@/lib/admin-server';
import {canAdminTransitionOrder, isAdminTargetStatus, isOrderStatus} from '@/lib/order-status';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

type RouteContext = {params: Promise<{id: string}>};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminUser = await getVerifiedAdmin();
  if (!adminUser) return NextResponse.json({error: 'Administrator authentication required.'}, {status: 401});
  if (!canManageOrderStatus(adminUser.role)) {
    return NextResponse.json({error: 'Your role cannot change order payment or fulfillment status.'}, {status: 403});
  }

  const {id} = await context.params;
  const body = await request.json() as {status?: string};
  if (!isAdminTargetStatus(body.status)) {
    return NextResponse.json({error: 'Invalid order status.'}, {status: 400});
  }

  const status = body.status;
  const admin = getSupabaseAdminClient();
  const {data: existing, error: readError} = await admin
    .from('akl_orders')
    .select('id,user_id,payment_reference,status')
    .eq('order_number', id)
    .maybeSingle();
  if (readError) return NextResponse.json({error: 'Unable to load this order.'}, {status: 500});
  if (!existing) return NextResponse.json({error: 'Order not found.'}, {status: 404});
  if (!isOrderStatus(existing.status)) {
    return NextResponse.json({error: 'The order has an unsupported stored status.'}, {status: 409});
  }
  const currentStatus = existing.status;
  if (!canAdminTransitionOrder(currentStatus, status)) {
    return NextResponse.json({error: `An order cannot move from ${currentStatus} to ${status}.`}, {status: 409});
  }
  if ((status === 'Verified' || status === 'Access sent') && !existing.payment_reference) {
    return NextResponse.json({error: 'An order without a submitted UPI reference cannot be verified or fulfilled.'}, {status: 409});
  }
  if (status === 'Access sent' && !existing.user_id) {
    return NextResponse.json({error: 'Product access cannot be sent because the customer account no longer exists.'}, {status: 409});
  }

  const {data: updated, error: updateError} = await admin
    .from('akl_orders')
    .update({status, updated_at: new Date().toISOString()})
    .eq('id', existing.id)
    .eq('status', currentStatus)
    .select('order_number,status')
    .maybeSingle();
  if (updateError) {
    console.error('Admin order update failed:', updateError.message);
    return NextResponse.json({error: 'Unable to update the order.'}, {status: 500});
  }
  if (!updated) {
    return NextResponse.json({error: 'This order changed while it was being updated. Refresh and try again.'}, {status: 409});
  }

  if (status === 'Access sent' && existing.user_id) {
    const {data: orderItems, error: itemError} = await admin
      .from('akl_order_items')
      .select('product_id')
      .eq('order_id', existing.id);
    if (itemError) {
      await admin.from('akl_orders').update({status: 'Verified', updated_at: new Date().toISOString()}).eq('id', existing.id);
      return NextResponse.json({error: 'Product access could not be prepared, so the order was returned to Verified.'}, {status: 500});
    }
    const grants = (orderItems || []).flatMap(item => item.product_id ? [{
      user_id: existing.user_id,
      product_id: item.product_id,
      order_id: existing.id,
    }] : []);
    if (!grants.length) {
      await admin.from('akl_orders').update({status: 'Verified', updated_at: new Date().toISOString()}).eq('id', existing.id);
      return NextResponse.json({error: 'This order has no deliverable products, so it was returned to Verified.'}, {status: 409});
    }
    const {error: grantError} = await admin.from('akl_product_access').upsert(grants);
    if (grantError) {
      await admin.from('akl_orders').update({status: 'Verified', updated_at: new Date().toISOString()}).eq('id', existing.id);
      return NextResponse.json({error: 'Product access could not be granted, so the order was returned to Verified.'}, {status: 500});
    }
  }

  return NextResponse.json({order: {id: updated.order_number, status: updated.status}}, {headers: {'Cache-Control': 'no-store'}});
}
