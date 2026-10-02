"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, CircleAlert, Flower2, LoaderCircle, Minus, Plus, ShoppingBag, Trash2, UserRound, X } from "lucide-react";

export type Product = {
  id: string; slug: string; name: string; category: "abayas" | "hijabs";
  description: string; price_cents: number; currency: string; image_url: string;
  gallery_urls: string[]; sizes: string[]; color: string;
};
export type CartItem = { id: string; product_id: string; size: string; quantity: number; product: Product | null };
type Customer = { id: string; email: string; name: string; avatarUrl: string | null };

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init, cache: "no-store", credentials: "same-origin",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(response.status, data.error || "Please try again.");
  return data as T;
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);
}

export function useRemote<T>(path: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ path: string; version: number; data: T | null; error: string | null; status: number }>({ path: "", version: -1, data: null, error: null, status: 0 });
  useEffect(() => {
    let active = true;
    request<T>(path).then(
      (data) => { if (active) setState({ path, version, data, error: null, status: 200 }); },
      (error) => { if (active) setState({ path, version, data: null, error: error.message || "Please try again.", status: error.status || 500 }); },
    );
    return () => { active = false; };
  }, [path, version]);
  const loading = state.path !== path || state.version !== version;
  return { data: loading ? null : state.data, error: loading ? null : state.error, status: state.status, loading, retry: () => setVersion((value) => value + 1) };
}

type Store = {
  user: Customer | null; loading: boolean; cart: CartItem[]; cartError: string | null;
  cartOpen: boolean; setCartOpen: (open: boolean) => void;
  busy: boolean; checkoutBusy: boolean; setCheckoutBusy: (value: boolean) => void;
  refreshCart: () => Promise<void>;
  changeCart: (productId: string, size: string, quantity: number, method: "POST" | "PATCH" | "DELETE") => Promise<void>;
  clearCart: () => void; notify: (message: string) => void;
};
const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Store provider is missing");
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const refreshCart = useCallback(async () => {
    try {
      const { items } = await request<{ items: CartItem[] }>("/api/cart");
      setCart(items);
      setCartError(null);
      if (!items.length) setCartOpen(false);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Your bag could not be loaded.");
      throw error;
    }
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await request<{ user: Customer | null }>("/api/auth");
        if (!active) return;
        setUser(result.user);
        if (result.user) await refreshCart();
      } catch { /* Page-level requests show any connection error. */ }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [refreshCart]);
  useEffect(() => {
    if (!user) return;
    const onFocus = () => { if (!mutationInFlight.current && !checkoutBusy) void refreshCart().catch(() => {}); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refreshCart, checkoutBusy]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function changeCart(productId: string, size: string, quantity: number, method: "POST" | "PATCH" | "DELETE") {
    if (mutationInFlight.current || checkoutBusy) return;
    mutationInFlight.current = true;
    setBusy(true);
    try {
      await request("/api/cart", { method, body: JSON.stringify({ productId, size, quantity }) });
      await refreshCart();
      if (method === "POST") setCartOpen(true);
    } finally { mutationInFlight.current = false; setBusy(false); }
  }
  return (
    <StoreContext.Provider value={{ user, loading, cart, cartError, cartOpen, setCartOpen, busy, checkoutBusy, setCheckoutBusy, refreshCart, changeCart, clearCart: () => { setCart([]); setCartOpen(false); }, notify: setNotice }}>
      {children}
      {notice && <div className="toast" role="status"><CircleAlert size={17} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={17} /></button></div>}
    </StoreContext.Provider>
  );
}

const crops: Record<string, [number, number, number, number]> = {
  "ameera-embroidered-abaya": [827, 77, 194, 244],
  "layla-silk-sand-abaya": [604, 132, 90, 109],
  "hana-cotton-abaya": [19, 1226, 113, 131],
  "lale-pleated-hijab": [217, 360, 153, 187],
  "pearl-artisanal-hijab": [703, 133, 89, 106],
  "noor-cotton-hijab": [20, 938, 151, 155],
};
const seedPaths = ["/images/ameera-abaya.jpg", "/images/layla-abaya.jpg", "/images/hana-abaya.jpg", "/images/lale-hijab.jpg", "/images/pearl-hijab.jpg", "/images/noor-hijab.jpg"];
export function ProductPhoto({ product, slug, className = "", imageUrl }: { product?: Product | null; slug?: string; className?: string; imageUrl?: string }) {
  const source = imageUrl || product?.image_url;
  const [failed, setFailed] = useState<string | null>(null);
  const [x, y, width, height] = crops[slug || product?.slug || ""] || crops["pearl-artisanal-hijab"];
  const style: CSSProperties = {
    backgroundImage: "url('/images/reference.jpg')",
    backgroundSize: `${1600 / width * 100}% ${1536 / height * 100}%`,
    backgroundPosition: `${x / (1600 - width) * 100}% ${y / (1536 - height) * 100}%`,
  };
  const useOriginal = source && !seedPaths.includes(source) && failed !== source;
  return <div className={`product-photo ${className}`} style={useOriginal ? undefined : style} role={useOriginal ? undefined : "img"} aria-label={useOriginal ? undefined : product?.name || "Fihan collection"}>
    {useOriginal && <img src={source} alt={product?.name || "Fihan collection"} loading="lazy" onError={() => setFailed(source)} />}
  </div>;
}

export function Brand() {
  return <span className="brand"><Flower2 size={23} strokeWidth={1.2} /><span>FIHAN<span className="brand-sub">MODEST ATELIER</span></span></span>;
}

export function Header() {
  const store = useStore();
  const pathname = usePathname();
  const { cartOpen, setCartOpen } = store;
  const anchor = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const count = store.cart.reduce((total, item) => total + item.quantity, 0);
  const total = store.cart.reduce((value, item) => value + (item.product?.price_cents || 0) * item.quantity, 0);
  useEffect(() => {
    if (!cartOpen) return;
    closeButton.current?.focus();
    const close = (event: PointerEvent) => { if (!anchor.current?.contains(event.target as Node)) setCartOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setCartOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [cartOpen, setCartOpen]);
  async function change(item: CartItem, quantity: number, method: "PATCH" | "DELETE") {
    try { await store.changeCart(item.product_id, item.size, quantity, method); }
    catch (error) { store.notify(error instanceof Error ? error.message : "Please try again."); }
  }
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" aria-label="Fihan Store home" onClick={() => store.setCartOpen(false)}><Brand /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={() => store.setCartOpen(false)}>Home</Link>
        <Link href="/shop" aria-current={pathname.startsWith("/shop") || pathname.startsWith("/products") ? "page" : undefined} onClick={() => store.setCartOpen(false)}>Shop</Link>
      </nav>
      <div className="header-tools">
        {store.loading ? <span className="profile-loading" aria-label="Loading profile"><LoaderCircle size={18} className="spin" /></span> : store.user ? <span className="profile-icon" title={store.user.name} aria-label={`Signed in as ${store.user.name}`}><UserRound size={19} strokeWidth={1.5} /></span> : <a className="signup-button" href={`/auth/login?next=${encodeURIComponent(pathname)}`}>Sign up</a>}
        <div className="cart-anchor" ref={anchor}>
          <button className="cart-toggle icon-button" title={count ? "Open your bag" : "Your bag is empty"} aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`} aria-expanded={store.cartOpen && count > 0} aria-controls="cart-popover" disabled={!count} onClick={() => store.setCartOpen(!store.cartOpen)}>
            <ShoppingBag size={23} strokeWidth={1.5} />{count > 0 && <span className="cart-badge">{count}</span>}
          </button>
          {store.cartOpen && count > 0 && <div className="cart-popover" id="cart-popover" role="dialog" aria-label="Your shopping bag">
            <div className="cart-heading"><h2>Your bag <span>({count})</span></h2><button ref={closeButton} className="icon-button" aria-label="Close bag" title="Close bag" onClick={() => store.setCartOpen(false)}><X size={20} /></button></div>
            <ul className="cart-list">{store.cart.map((item) => <li key={item.id} className="cart-row">
              <ProductPhoto product={item.product} />
              <div className="cart-row-content"><p className="cart-product-name">{item.product?.name || "Unavailable product"}</p><p className="muted small">{item.size}{item.product ? ` / ${item.product.color}` : ""}</p><p className="small">{item.product ? money(item.product.price_cents * item.quantity) : "Remove to continue"}</p>
                <div className="cart-row-actions"><div className="quantity-control compact"><button aria-label={`Decrease ${item.product?.name || "item"} quantity`} title="Decrease quantity" disabled={store.busy || store.checkoutBusy || item.quantity <= 1 || !item.product} onClick={() => void change(item, item.quantity - 1, "PATCH")}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label={`Increase ${item.product?.name || "item"} quantity`} title="Increase quantity" disabled={store.busy || store.checkoutBusy || item.quantity >= 20 || !item.product} onClick={() => void change(item, item.quantity + 1, "PATCH")}><Plus size={13} /></button></div><button className="icon-button remove-item" aria-label={`Remove ${item.product?.name || "item"}`} title="Remove item" disabled={store.busy || store.checkoutBusy} onClick={() => void change(item, 0, "DELETE")}><Trash2 size={15} /></button></div>
              </div>
            </li>)}</ul>
            {store.cartError && <p className="error-text" role="alert">{store.cartError}</p>}
            <div className="cart-total"><span>Subtotal</span><strong>{money(total)}</strong></div>
            <Link href="/checkout" className={`button primary full ${store.busy || store.checkoutBusy ? "disabled" : ""}`} aria-disabled={store.busy || store.checkoutBusy} onClick={(event) => { if (store.busy || store.checkoutBusy) event.preventDefault(); else store.setCartOpen(false); }}>Go to checkout <ArrowRight size={16} /></Link>
          </div>}
        </div>
      </div>
    </div>
    {store.cartError && !store.cartOpen && <div className="cart-recovery" role="alert"><span>{store.cartError}</span><button onClick={() => void store.refreshCart().catch(() => {})}>Retry</button></div>}
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><div><Link href="/" aria-label="Fihan Store home"><Brand /></Link><p>Thoughtful pieces. Effortless modesty.</p></div><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/shop">Shop</Link></nav><p className="copyright">&copy; {new Date().getFullYear()} Fihan Store</p></div></footer>;
}

export function ProductTile({ product, displayOnly = false }: { product: Product; displayOnly?: boolean }) {
  const content = <><ProductPhoto product={product} /><div className="product-caption"><span className="eyebrow">{product.category === "abayas" ? "ABAYA" : "HIJAB"}</span><h3>{product.name}</h3><div className="product-caption-bottom"><span>{money(product.price_cents)}</span><span className="muted small">{product.color}</span></div></div></>;
  return displayOnly ? <article className="product-tile">{content}</article> : <Link className="product-tile" href={`/products/${product.slug}`}>{content}</Link>;
}

export function LoadingProducts() {
  return <div className="product-grid" aria-label="Loading products" aria-busy="true">{[0, 1, 2, 3].map((item) => <div key={item} className="product-skeleton"><div /><span /><span /></div>)}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="empty-state" role="alert"><ShoppingBag size={29} strokeWidth={1} /><h2>Something went wrong</h2><p>{message}</p><button className="button secondary" onClick={retry}>Try again</button></div>;
}
