begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('abayas', 'hijabs')),
  description text not null,
  price_cents integer not null check (price_cents > 0 and price_cents <= 1000000),
  currency text not null default 'USD' check (currency = 'USD'),
  image_url text not null,
  gallery_urls text[] not null default '{}',
  sizes text[] not null default array['One Size'] check (cardinality(sizes) > 0),
  color text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  unique (user_id, product_id, size)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  customer_name text not null,
  customer_email text not null,
  phone text not null,
  shipping_address jsonb not null,
  total_cents bigint not null check (total_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  payment_status text not null default 'simulated' check (payment_status = 'simulated'),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text not null,
  size text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents > 0)
);

create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index cart_items_product_idx on public.cart_items(product_id);
create index order_items_product_idx on public.order_items(product_id);

alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.products, public.cart_items, public.orders, public.order_items from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.cart_items, public.orders, public.order_items to authenticated;

create policy "Anyone can view active products" on public.products
  for select to anon, authenticated using (active);
create policy "Customers can read their cart" on public.cart_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can read their orders" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can read their order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid()))
  );

-- All cart mutations share the checkout lock, including requests made through the Data API.
create function public.change_cart_item(p_product_id uuid, p_size text, p_quantity integer, p_mode text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in to manage your cart' using errcode = '28000';
  end if;
  if p_mode is null or p_mode not in ('add', 'set', 'remove') then
    raise exception 'Invalid cart action' using errcode = '22023';
  end if;
  if p_product_id is null or p_size is null or length(p_size) > 40 then
    raise exception 'Product and size are required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if p_mode = 'remove' then
    delete from public.cart_items where user_id = v_user_id and product_id = p_product_id and size = p_size;
    return;
  end if;
  if p_quantity is null or p_quantity not between 1 and 20 then
    raise exception 'Quantity must be between 1 and 20' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and active and p_size = any(sizes)) then
    raise exception 'Product or size is unavailable' using errcode = '22023';
  end if;
  if p_mode = 'add' then
    insert into public.cart_items(user_id, product_id, size, quantity)
    values (v_user_id, p_product_id, p_size, p_quantity)
    on conflict (user_id, product_id, size) do update
      set quantity = cart_items.quantity + excluded.quantity;
  else
    update public.cart_items set quantity = p_quantity
    where user_id = v_user_id and product_id = p_product_id and size = p_size;
    if not found then
      raise exception 'Cart item not found' using errcode = '22023';
    end if;
  end if;
end;
$$;

create function public.create_order(p_idempotency_key uuid, p_customer_name text, p_phone text, p_shipping_address jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_total bigint;
  v_email text;
  v_field text;
begin
  if v_user_id is null then
    raise exception 'Sign in to checkout' using errcode = '28000';
  end if;
  if p_idempotency_key is null then
    raise exception 'Order request ID is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select id into v_order_id from public.orders where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then return v_order_id; end if;
  if p_customer_name is null or length(trim(p_customer_name)) not between 2 and 120
    or p_phone is null or length(trim(p_phone)) not between 5 and 40 then
    raise exception 'Valid name and phone are required' using errcode = '22023';
  end if;
  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'Delivery address is required' using errcode = '22023';
  end if;
  foreach v_field in array array['address', 'city', 'country'] loop
    if jsonb_typeof(p_shipping_address -> v_field) is distinct from 'string'
      or length(trim(p_shipping_address ->> v_field)) not between 1 and 300 then
      raise exception 'Address, city and country are required' using errcode = '22023';
    end if;
  end loop;
  if octet_length(p_shipping_address::text) > 4000 then
    raise exception 'Delivery address is too long' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'An account email is required' using errcode = '22023';
  end if;
  -- Lock product rows so concurrent catalogue edits cannot change the order snapshot.
  perform p.id from public.products p join public.cart_items c on c.product_id = p.id
    where c.user_id = v_user_id order by p.id for share of p;
  if exists (
    select 1 from public.cart_items c join public.products p on p.id = c.product_id
    where c.user_id = v_user_id and (not p.active or not (c.size = any(p.sizes)))
  ) then
    raise exception 'A cart product is unavailable; remove it before checkout' using errcode = '22023';
  end if;
  select sum(c.quantity::bigint * p.price_cents) into v_total
    from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = v_user_id;
  if v_total is null then
    raise exception 'Your cart is empty' using errcode = '22023';
  end if;
  insert into public.orders(user_id, idempotency_key, customer_name, customer_email, phone, shipping_address, total_cents)
    values (v_user_id, p_idempotency_key, trim(p_customer_name), v_email, trim(p_phone), p_shipping_address, v_total)
    returning id into v_order_id;
  insert into public.order_items(order_id, product_id, product_name, image_url, size, quantity, unit_price_cents)
    select v_order_id, p.id, p.name, p.image_url, c.size, c.quantity, p.price_cents
    from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = v_user_id;
  delete from public.cart_items where user_id = v_user_id;
  return v_order_id;
end;
$$;

revoke all on function public.change_cart_item(uuid, text, integer, text) from public, anon;
revoke all on function public.create_order(uuid, text, text, jsonb) from public, anon;
grant execute on function public.change_cart_item(uuid, text, integer, text) to authenticated;
grant execute on function public.create_order(uuid, text, text, jsonb) to authenticated;

commit;
