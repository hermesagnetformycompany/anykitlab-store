'use client';

import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {products as fallbackProducts, type Product} from './data';
import {hasSupabaseConfig} from './supabase/config';
import {getSupabaseBrowserClient} from './supabase/client';

export type CartItem = {slug: string; qty: number};
export type Customer = {id?: string; name: string; email: string; phone: string};
export type Order = {
  id: string;
  date: string;
  total: number;
  status: 'Awaiting payment' | 'Pending verification' | 'Verified' | 'Access sent' | 'Rejected';
  reference: string;
  items: CartItem[];
  name: string;
  email: string;
  phone?: string;
};

type AuthResult = {ok: boolean; error?: string; requiresConfirmation?: boolean};

type Store = {
  ready: boolean;
  cart: CartItem[];
  products: Product[];
  wishlist: string[];
  orders: Order[];
  customer: Customer | null;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  recordOrder: (order: Order) => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  register: (customer: Customer, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<AuthResult>;
  toggleWishlist: (slug: string) => Promise<AuthResult>;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total: number;
  payment_reference: string | null;
  status: Order['status'];
  created_at: string;
  akl_order_items?: {product_slug: string; quantity: number}[];
};

const StoreContext = createContext<Store | null>(null);

const readLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

function mapOrder(row: OrderRow): Order {
  return {
    id: row.order_number,
    date: new Date(row.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}),
    total: row.total,
    status: row.status,
    reference: row.payment_reference || '',
    items: (row.akl_order_items || []).map(item => ({slug: item.product_slug, qty: item.quantity})),
    name: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone || '',
  };
}

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const productIds = useRef(new Map<string, string>());
  const cartSyncRevision = useRef(0);
  const cartSyncQueue = useRef<Promise<void>>(Promise.resolve());

  const loadAccount = useCallback(async (userId: string, email: string) => {
    const supabase = getSupabaseBrowserClient();
    setAccountReady(false);
    const [profileResult, orderResult, productResult, cartResult, wishlistResult] = await Promise.all([
      supabase.from('akl_profiles').select('full_name,phone').eq('id', userId).maybeSingle(),
      supabase.from('akl_orders').select('id,order_number,customer_name,customer_email,customer_phone,total,payment_reference,status,created_at,akl_order_items(product_slug,quantity)').eq('user_id', userId).order('created_at', {ascending: false}),
      supabase.from('akl_products').select('id,slug').eq('status', 'Published'),
      supabase.from('akl_cart_items').select('product_id,quantity').eq('user_id', userId),
      supabase.from('akl_wishlist_items').select('product_id').eq('user_id', userId),
    ]);

    if (productResult.data) {
      productIds.current = new Map(productResult.data.map(item => [item.slug, item.id]));
    }
    const slugsById = new Map(Array.from(productIds.current.entries()).map(([slug, id]) => [id, slug]));
    const remoteCart = (cartResult.data || []).flatMap(item => {
      const slug = slugsById.get(item.product_id);
      return slug ? [{slug, qty: item.quantity}] : [];
    });
    const profile = profileResult.data;
    setCustomer({id: userId, name: profile?.full_name || email.split('@')[0], email, phone: profile?.phone || ''});
    setOrders(((orderResult.data || []) as OrderRow[]).map(mapOrder));
    setCart(remoteCart.length ? remoteCart : readLocal<CartItem[]>('ak-cart', []));
    setWishlist((wishlistResult.data || []).flatMap(item => {
      const slug = slugsById.get(item.product_id);
      return slug ? [slug] : [];
    }));
    setAccountReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    const localCart = readLocal<CartItem[]>('ak-cart', []);
    const configured = hasSupabaseConfig();
    const localTimer = window.setTimeout(() => {
      if (!active) return;
      setCart(localCart);
      if (!configured) {
        setReady(true);
        setAccountReady(true);
      }
    }, 0);

    if (!configured) {
      return () => {
        active = false;
        window.clearTimeout(localTimer);
      };
    }

    const supabase = getSupabaseBrowserClient();
    void fetch('/api/catalog').then(async response => {
      if (!response.ok) return;
      const payload = await response.json() as {products?: Product[]};
      if (payload.products?.length) {
        setProducts(payload.products);
        productIds.current = new Map(payload.products.map(product => [product.slug, product.id]));
      }
    }).catch(() => undefined);
    void supabase.auth.getUser().then(async ({data}) => {
      if (!active) return;
      if (data.user?.email) await loadAccount(data.user.id, data.user.email);
      else setAccountReady(true);
      if (active) setReady(true);
    });

    const {data: subscription} = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setCustomer(null);
        setOrders([]);
        setWishlist([]);
        setAccountReady(true);
      } else if (session?.user.email) {
        window.setTimeout(() => void loadAccount(session.user.id, session.user.email!), 0);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(localTimer);
      subscription.subscription.unsubscribe();
    };
  }, [loadAccount]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem('ak-cart', JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!ready || !accountReady || !customer?.id || !hasSupabaseConfig()) return;
    const revision = ++cartSyncRevision.current;
    const userId = customer.id;
    const rows = cart.flatMap(item => {
      const productId = productIds.current.get(item.slug);
      return productId ? [{user_id: userId, product_id: productId, quantity: item.qty}] : [];
    });
    const timer = window.setTimeout(() => {
      cartSyncQueue.current = cartSyncQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (revision !== cartSyncRevision.current) return;
          const supabase = getSupabaseBrowserClient();
          const {error: deleteError} = await supabase.from('akl_cart_items').delete().eq('user_id', userId);
          if (deleteError || revision !== cartSyncRevision.current) return;
          if (rows.length) await supabase.from('akl_cart_items').insert(rows);
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accountReady, cart, customer?.id, ready]);

  const add = (slug: string) => setCart(current => current.some(item => item.slug === slug)
    ? current.map(item => item.slug === slug ? {...item, qty: item.qty + 1} : item)
    : [...current, {slug, qty: 1}]);
  const remove = (slug: string) => setCart(current => current.filter(item => item.slug !== slug));
  const setQty = (slug: string, qty: number) => qty < 1
    ? remove(slug)
    : setCart(current => current.map(item => item.slug === slug ? {...item, qty} : item));
  const clear = () => setCart([]);

  const recordOrder = (order: Order) => {
    setOrders(current => [order, ...current.filter(existing => existing.id !== order.id)]);
    clear();
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!hasSupabaseConfig()) return {ok: false, error: 'Supabase is not configured in this environment.'};
    const supabase = getSupabaseBrowserClient();
    const {data, error} = await supabase.auth.signInWithPassword({email: email.trim().toLowerCase(), password});
    if (error || !data.user?.email) return {ok: false, error: error?.message || 'Unable to sign in.'};
    await loadAccount(data.user.id, data.user.email);
    return {ok: true};
  };

  const register = async (nextCustomer: Customer, password: string): Promise<AuthResult> => {
    if (!hasSupabaseConfig()) return {ok: false, error: 'Supabase is not configured in this environment.'};
    const email = nextCustomer.email.trim().toLowerCase();
    const supabase = getSupabaseBrowserClient();
    const {data, error} = await supabase.auth.signUp({
      email,
      password,
      options: {data: {full_name: nextCustomer.name.trim(), phone: nextCustomer.phone.trim(), site: 'anykitlab'}},
    });
    if (error) return {ok: false, error: error.message};
    if (data.session && data.user) await loadAccount(data.user.id, email);
    return {ok: true, requiresConfirmation: !data.session};
  };

  const signOut = async () => {
    if (hasSupabaseConfig()) await getSupabaseBrowserClient().auth.signOut();
    setCustomer(null);
    setOrders([]);
    setWishlist([]);
  };

  const updateCustomer = async (nextCustomer: Customer): Promise<AuthResult> => {
    if (!customer?.id || !hasSupabaseConfig()) return {ok: false, error: 'Sign in before updating your profile.'};
    const supabase = getSupabaseBrowserClient();
    const {error} = await supabase.from('akl_profiles').update({full_name: nextCustomer.name.trim(), phone: nextCustomer.phone.trim()}).eq('id', customer.id);
    if (error) return {ok: false, error: error.message};
    setCustomer({...nextCustomer, id: customer.id, email: customer.email});
    return {ok: true};
  };

  const toggleWishlist = async (slug: string): Promise<AuthResult> => {
    if (!customer?.id || !hasSupabaseConfig()) return {ok: false, error: 'Sign in to save kits to your wishlist.'};
    const productId = productIds.current.get(slug) || products.find(product => product.slug === slug)?.id;
    if (!productId) return {ok: false, error: 'This kit could not be found.'};
    const supabase = getSupabaseBrowserClient();
    if (wishlist.includes(slug)) {
      const {error} = await supabase.from('akl_wishlist_items').delete().eq('user_id', customer.id).eq('product_id', productId);
      if (error) return {ok: false, error: error.message};
      setWishlist(current => current.filter(item => item !== slug));
    } else {
      const {error} = await supabase.from('akl_wishlist_items').upsert({user_id: customer.id, product_id: productId});
      if (error) return {ok: false, error: error.message};
      setWishlist(current => [...current, slug]);
    }
    return {ok: true};
  };

  return (
    <StoreContext.Provider value={{ready, cart, products, wishlist, orders, customer, add, remove, setQty, clear, recordOrder, signIn, register, signOut, updateCustomer, toggleWishlist}}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('StoreProvider missing');
  return context;
};

export const cartTotal = (cart: CartItem[], products: Product[] = fallbackProducts) => cart.reduce((sum, item) => (
  sum + (products.find(product => product.slug === item.slug)?.price || 0) * item.qty
), 0);
