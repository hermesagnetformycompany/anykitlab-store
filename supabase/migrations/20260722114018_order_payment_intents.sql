begin;

alter table public.akl_orders
  drop constraint if exists akl_orders_status_check;

alter table public.akl_orders
  alter column payment_reference drop not null,
  alter column status set default 'Awaiting payment',
  add column if not exists checkout_key uuid;

update public.akl_orders
set checkout_key = gen_random_uuid()
where checkout_key is null;

alter table public.akl_orders
  alter column checkout_key set default gen_random_uuid(),
  alter column checkout_key set not null;

create unique index if not exists akl_orders_checkout_key_idx
  on public.akl_orders (user_id, checkout_key);

create or replace function public.akl_create_payment_intent(
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total integer,
  p_checkout_key uuid,
  p_items jsonb
)
returns table (
  id uuid,
  order_number text,
  total integer,
  status text,
  created_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.akl_orders%rowtype;
  v_created boolean := false;
  v_calculated_total bigint;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Payment intent items are required.';
  end if;

  select coalesce(sum(item.unit_price * item.quantity), 0)
  into v_calculated_total
  from jsonb_to_recordset(p_items) as item(
    product_id text,
    product_slug text,
    product_title text,
    unit_price integer,
    quantity integer
  );

  if p_total <= 0 or v_calculated_total <> p_total then
    raise exception 'Payment intent total does not match its item snapshots.';
  end if;

  insert into public.akl_orders (
    user_id, customer_name, customer_email, customer_phone, total,
    payment_reference, payment_method, status, checkout_key
  ) values (
    p_user_id, p_customer_name, p_customer_email, p_customer_phone, p_total,
    null, 'UPI', 'Awaiting payment', p_checkout_key
  )
  on conflict (user_id, checkout_key) do nothing
  returning * into v_order;

  if found then
    v_created := true;
    insert into public.akl_order_items (
      order_id, product_id, product_slug, product_title, unit_price, quantity
    )
    select
      v_order.id, item.product_id, item.product_slug, item.product_title,
      item.unit_price, item.quantity
    from jsonb_to_recordset(p_items) as item(
      product_id text,
      product_slug text,
      product_title text,
      unit_price integer,
      quantity integer
    );
  else
    select * into v_order
    from public.akl_orders
    where user_id = p_user_id and checkout_key = p_checkout_key;
  end if;

  return query select
    v_order.id, v_order.order_number, v_order.total, v_order.status,
    v_order.created_at, v_created;
end;
$$;

revoke all on function public.akl_create_payment_intent(uuid, text, text, text, integer, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.akl_create_payment_intent(uuid, text, text, text, integer, uuid, jsonb) to service_role;

alter table public.akl_orders
  add constraint akl_orders_status_check
  check (status in ('Awaiting payment', 'Pending verification', 'Verified', 'Access sent', 'Rejected'));

comment on column public.akl_orders.payment_reference is
  'Buyer-submitted UPI UTR. Null while the immutable order is awaiting payment.';

comment on column public.akl_orders.total is
  'Server-computed immutable INR amount presented in the order-specific UPI payment intent.';

comment on column public.akl_orders.checkout_key is
  'Customer-scoped idempotency key used to prevent duplicate payment intents on retries.';

commit;
