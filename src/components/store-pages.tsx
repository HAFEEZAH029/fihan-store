"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Leaf, LoaderCircle, LockKeyhole, Minus, PackageCheck, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { ErrorState, LoadingProducts, money, ProductPhoto, ProductTile, request, RequestError, useRemote, useStore, type Product } from "./store-ui";

function signIn(next: string) {
  window.location.href = new URL(`/auth/login?next=${encodeURIComponent(next)}`, window.location.origin).href;
}

export function HomeView() {
  const products = useRemote<{ products: Product[] }>("/api/products");
  return <main>
    <section className="home-hero"><div className="hero-inner"><span className="eyebrow">THE EVERYDAY, ELEVATED</span><h1>Fihan Store</h1><p className="hero-tagline">Grace in every thread.</p><p className="hero-copy">Abayas and hijabs made for the way you move.<br />Quiet beauty, thoughtfully considered.</p><div className="hero-actions"><Link href="/shop?category=abayas" className="button light">Shop abayas <ArrowRight size={16} /></Link><Link href="/shop?category=hijabs" className="button hero-outline">Shop hijabs <ArrowRight size={16} /></Link></div></div><span className="hero-note">THE FIHAN COLLECTION / 2026</span></section>
    <div className="qualities"><div><Leaf size={19} strokeWidth={1.3} /><span>Considered fabrics</span></div><div><Sparkles size={19} strokeWidth={1.3} /><span>Details that make a difference</span></div><div><PackageCheck size={19} strokeWidth={1.3} /><span>Made for your everyday</span></div></div>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">THE COLLECTIONS</span><h2>The defined silhouette</h2></div><p>Beautifully simple pieces.<br />An unmistakably personal expression.</p></div><div className="collection-grid"><Link href="/shop?category=abayas" className="collection"><div className="collection-image"><ProductPhoto slug="ameera-embroidered-abaya" /><span className="image-label">TIMELESS BY DESIGN</span></div><div className="collection-caption"><div><h3>The Abaya Edit</h3><p>Fluid silhouettes, considered details.</p></div><span className="text-link">Shop abayas <ArrowRight size={17} /></span></div></Link><Link href="/shop?category=hijabs" className="collection"><div className="collection-image"><ProductPhoto slug="lale-pleated-hijab" /><span className="image-label">SOFTLY EXPRESSED</span></div><div className="collection-caption"><div><h3>The Hijab Collection</h3><p>Soft textures. Effortless drape.</p></div><span className="text-link">Shop hijabs <ArrowRight size={17} /></span></div></Link></div></section>
    <section className="highlights section"><div className="container"><div className="section-heading"><div><span className="eyebrow">CONSIDERED FAVORITES</span><h2>Atelier highlights</h2></div><Link href="/shop" className="text-link">View all pieces <ArrowRight size={16} /></Link></div>{products.loading ? <LoadingProducts /> : products.error ? <ErrorState message={products.error} retry={products.retry} /> : <div className="product-grid">{products.data?.products.slice(0, 4).map((product) => <ProductTile key={product.id} product={product} displayOnly />)}</div>}</div></section>
    <section className="story section container"><ProductPhoto slug="noor-cotton-hijab" /><div className="story-copy"><span className="eyebrow">CRAFT &amp; INTENTION</span><h2>The Fihan philosophy</h2><p>We believe the pieces you reach for every day should feel as beautiful as they look.</p><p>Our collection brings together flowing silhouettes, gentle textures, and thoughtful details. Modesty, made personal.</p><div className="story-values"><span>Considered<br /><strong>in every detail</strong></span><span>Beautiful<br /><strong>in every moment</strong></span></div></div></section>
    <section className="lookbook section"><div className="container"><div className="section-heading"><div><span className="eyebrow">THE FIHAN EDIT</span><h2>A quiet kind of elegance</h2></div><p>Pieces to make your own.</p></div><div className="lookbook-grid">{["hana-cotton-abaya", "ameera-embroidered-abaya", "layla-silk-sand-abaya"].map((slug, index) => <div key={slug}><ProductPhoto slug={slug} /><p>{["An effortless expression", "Beauty in the details", "Made for every day"][index]}</p></div>)}</div></div></section>
  </main>;
}

export function ShopView({ category }: { category: string }) {
  const current = ["abayas", "hijabs"].includes(category) ? category : "all";
  const result = useRemote<{ products: Product[] }>(`/api/products?category=${current}`);
  return <main className="container shop-page"><div className="shop-heading"><span className="eyebrow">THOUGHTFULLY CREATED / BEAUTIFULLY WORN</span><h1>Our collection</h1><p>Discover everyday elegance in flowing abayas and softly draped hijabs.</p></div><div className="shop-toolbar"><nav className="category-tabs" aria-label="Product categories">{["all", "abayas", "hijabs"].map((value) => <Link key={value} href={value === "all" ? "/shop" : `/shop?category=${value}`} aria-current={current === value ? "page" : undefined}>{value === "all" ? "All pieces" : value === "abayas" ? "Abayas" : "Hijabs"}</Link>)}</nav><span className="muted small">{result.loading ? "" : `${result.data?.products.length || 0} pieces`}</span></div>{result.loading ? <LoadingProducts /> : result.error ? <ErrorState message={result.error} retry={result.retry} /> : !result.data?.products.length ? <div className="empty-state"><h2>More pieces are on their way</h2><Link href="/shop" className="text-link">View all pieces <ArrowRight size={16} /></Link></div> : <div className="product-grid">{result.data.products.map((product) => <ProductTile key={product.id} product={product} />)}</div>}<div className="shop-note"><Leaf size={19} strokeWidth={1.3} /><p>Every piece begins with a little intention. Find the one that feels like you.</p></div></main>;
}

const colors: Record<string, string> = { Espresso: "#40332d", Sand: "#d5c9b2", Mocha: "#8d7464", Latte: "#c5b295", Pearl: "#e7e1d9", Olive: "#747c5b" };

export function ProductView({ slug, initialSize, initialQuantity }: { slug: string; initialSize: string; initialQuantity: number }) {
  const result = useRemote<{ product: Product }>(`/api/products/${encodeURIComponent(slug)}`);
  const related = useRemote<{ products: Product[] }>("/api/products");
  const store = useStore();
  const [size, setSize] = useState(initialSize);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | undefined>();
  const product = result.data?.product;
  if (result.loading) return <main className="container product-loading"><div className="product-skeleton"><div /></div><div><span className="eyebrow">FIHAN COLLECTION</span><p>Loading your piece...</p></div></main>;
  if (result.error || !product) return <main className="container">{result.status === 404 ? <div className="empty-state"><h1>Piece not found</h1><Link href="/shop" className="button secondary">Back to the collection <ArrowRight size={16} /></Link></div> : <ErrorState message={result.error || "Product could not be loaded."} retry={result.retry} />}</main>;
  const selectedSize = product.sizes.includes(size) ? size : product.sizes[0];
  async function addToCart() {
    if (!product) return;
    setError(null);
    const next = `/products/${product.slug}?size=${encodeURIComponent(selectedSize)}&quantity=${quantity}`;
    if (!store.user) { signIn(next); return; }
    try { await store.changeCart(product.id, selectedSize, quantity, "POST"); }
    catch (cause) {
      if (cause instanceof RequestError && cause.status === 401) { signIn(next); return; }
      setError(cause instanceof Error ? cause.message : "Your item could not be added. Please try again.");
    }
  }
  return <main><div className="container"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/shop">Shop</Link><span>/</span><span>{product.name}</span></nav><div className="product-detail"><div className="product-gallery"><ProductPhoto product={product} imageUrl={selectedImage} />{product.gallery_urls.length > 0 && <div className="gallery-thumbnails">{[product.image_url, ...product.gallery_urls].map((image, index) => <button key={image} aria-label={`View product image ${index + 1}`} aria-pressed={(selectedImage || product.image_url) === image} onClick={() => setSelectedImage(image)}><ProductPhoto product={product} imageUrl={image} /></button>)}</div>}</div><div className="product-information"><span className="eyebrow">THE FIHAN COLLECTION / {product.category === "abayas" ? "ABAYA" : "HIJAB"}</span><h1>{product.name}</h1><p className="detail-price">{money(product.price_cents)} <span>USD</span></p><p className="product-description">{product.description}</p><div className="product-option"><span className="option-label">Color <span className="muted">/ {product.color}</span></span><span className="color-swatch" title={product.color} style={{ background: colors[product.color] || "#b4b2ab" }} /></div><fieldset className="product-option size-options"><legend className="option-label">Size</legend><div>{product.sizes.map((value) => <button key={value} type="button" className={selectedSize === value ? "selected" : ""} aria-pressed={selectedSize === value} onClick={() => setSize(value)}>{value}</button>)}</div></fieldset><div className="purchase-actions"><div className="quantity-control"><button aria-label="Decrease quantity" title="Decrease quantity" disabled={quantity <= 1 || store.busy} onClick={() => setQuantity((value) => value - 1)}><Minus size={16} /></button><span aria-live="polite">{quantity}</span><button aria-label="Increase quantity" title="Increase quantity" disabled={quantity >= 20 || store.busy} onClick={() => setQuantity((value) => value + 1)}><Plus size={16} /></button></div><button className="button primary" disabled={store.loading || store.busy || store.checkoutBusy} onClick={() => void addToCart()}>{store.busy ? <LoaderCircle size={18} className="spin" /> : <ShoppingBag size={18} />} {store.busy ? "Adding..." : "Add to bag"}</button></div>{error && <p className="error-text" role="alert">{error}</p>}<div className="detail-qualities"><span><Leaf size={17} />Considered fabrics</span><span><PackageCheck size={17} />Thoughtfully finished</span></div><details open><summary>Details &amp; care</summary><p>Wear it your way. Hand wash gently in cool water, air dry, and iron on a low setting. Store folded or on a hanger to preserve its drape.</p></details></div></div></div>{related.data && <section className="section related-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">A LITTLE MORE TO LOVE</span><h2>Considered companions</h2></div><Link href="/shop" className="text-link">View all pieces <ArrowRight size={16} /></Link></div><div className="product-grid">{related.data.products.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductTile key={item.id} product={item} />)}</div></div></section>}</main>;
}

export function CheckoutView({ customerName, customerEmail }: { customerName: string; customerEmail: string }) {
  const store = useStore();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{ id: string; total_cents: number } | null>(null);
  const [countdown, setCountdown] = useState(5);
  const dialog = useRef<HTMLDialogElement>(null);
  const submissionInFlight = useRef(false);
  const retryRequest = useRef<{ id: string; fingerprint: string } | null>(null);
  useEffect(() => {
    if (!order) return;
    dialog.current?.showModal();
    const timer = setTimeout(() => router.replace("/"), 5000);
    const tick = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, [order, router]);
  const total = store.cart.reduce((value, item) => value + (item.product?.price_cents || 0) * item.quantity, 0);
  const unavailable = store.cart.some((item) => !item.product);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current || store.busy || unavailable) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    store.setCheckoutBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const fingerprint = store.cart.map((item) => `${item.product_id}:${item.size}:${item.quantity}`).sort().join("|");
    let requestId = retryRequest.current?.fingerprint === fingerprint ? retryRequest.current.id : crypto.randomUUID();
    try {
      const cached = sessionStorage.getItem("fihan-checkout-request");
      if (cached) { const previous = JSON.parse(cached); if (previous.fingerprint === fingerprint) requestId = previous.id; }
      sessionStorage.setItem("fihan-checkout-request", JSON.stringify({ id: requestId, fingerprint }));
    } catch { /* The current request still has an ID if storage is unavailable. */ }
    retryRequest.current = { id: requestId, fingerprint };
    try {
      const [result] = await Promise.all([
        request<{ order: { id: string; total_cents: number } }>("/api/orders", {
          method: "POST", body: JSON.stringify({ requestId, name: form.get("name"), phone: form.get("phone"), shipping: { address: form.get("address"), city: form.get("city"), country: form.get("country"), postalCode: form.get("postalCode") } }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);
      try { sessionStorage.removeItem("fihan-checkout-request"); } catch {}
      store.clearCart();
      retryRequest.current = null;
      setOrder(result.order);
    } catch (cause) {
      if (cause instanceof RequestError && cause.status === 401) { signIn("/checkout"); return; }
      setError(cause instanceof Error ? cause.message : "Your order could not be saved. Please try again.");
    } finally { submissionInFlight.current = false; setSubmitting(false); store.setCheckoutBusy(false); }
  }
  if (store.loading) return <main className="container empty-state"><LoaderCircle size={27} className="spin" /><p>Preparing your checkout...</p></main>;
  if (store.cartError) return <main className="container"><ErrorState message={store.cartError} retry={() => void store.refreshCart().catch(() => {})} /></main>;
  if (!store.cart.length && !order) return <main className="container empty-state"><ShoppingBag size={34} strokeWidth={1} /><h1>Your bag is waiting</h1><p>Find a piece to make your own.</p><Link href="/shop" className="button primary">Explore the collection <ArrowRight size={17} /></Link></main>;
  return <main className="container checkout-page"><Link href="/shop" className="back-link"><ArrowLeft size={15} /> Return to shop</Link><div className="checkout-title"><span className="eyebrow"><LockKeyhole size={13} /> YOUR FIHAN ORDER</span><h1>Checkout</h1></div><div className="checkout-layout"><form onSubmit={(event) => void submit(event)} className="checkout-form"><fieldset disabled={submitting || Boolean(order)}><legend><span>01</span> Your details</legend><div className="form-grid"><label className="full">Full name<input name="name" autoComplete="name" defaultValue={customerName} required minLength={2} maxLength={120} /></label><label className="full">Email address<input type="email" value={customerEmail} readOnly aria-readonly="true" /></label><label className="full">Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={5} maxLength={40} placeholder="+234" /></label></div></fieldset><fieldset disabled={submitting || Boolean(order)}><legend><span>02</span> Delivery address</legend><div className="form-grid"><label className="full">Street address<input name="address" autoComplete="address-line1" required maxLength={300} /></label><label>City<input name="city" autoComplete="address-level2" required maxLength={300} /></label><label>Country<input name="country" autoComplete="country-name" defaultValue="Nigeria" required maxLength={300} /></label><label className="full">Postal code <span className="muted">(optional)</span><input name="postalCode" autoComplete="postal-code" maxLength={40} /></label></div></fieldset><div className="payment-note"><LockKeyhole size={18} strokeWidth={1.5} /><div><strong>Simulated payment</strong><p>No payment details needed. You will not be charged.</p></div></div>{unavailable && <p className="error-text" role="alert">An item is unavailable. Remove it from your bag to continue.</p>}{error && <p className="error-text" role="alert">{error}</p>}<button className="button primary full checkout-submit" type="submit" disabled={submitting || store.busy || unavailable || Boolean(order)}>{submitting ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={17} />}{submitting ? "Processing your order..." : `Place order / ${money(total)}`}</button></form><aside className="order-summary"><div className="summary-heading"><h2>Your pieces</h2><span>{store.cart.reduce((value, item) => value + item.quantity, 0)} items</span></div><ul>{store.cart.map((item) => <li key={item.id}><ProductPhoto product={item.product} /><div><h3>{item.product?.name || "Unavailable product"}</h3><p>{item.size} / Qty {item.quantity}</p><strong>{money((item.product?.price_cents || 0) * item.quantity)}</strong></div></li>)}</ul><div className="summary-line"><span>Subtotal</span><span>{money(total)}</span></div><div className="summary-line"><span>Delivery</span><span>Complimentary</span></div><div className="summary-total"><span>Total <small>USD</small></span><strong>{money(total)}</strong></div><p className="summary-note"><Check size={15} />A little elegance, chosen by you.</p></aside></div><dialog className="success-dialog" ref={dialog} aria-labelledby="order-success-title" onCancel={() => router.replace("/")}><CheckCircle2 size={49} strokeWidth={1.1} /><span className="eyebrow">THANK YOU FOR CHOOSING FIHAN</span><h2 id="order-success-title">Your order is created.</h2><p>We have saved your order successfully.</p>{order && <p className="order-reference">Order #{order.id.slice(0, 8).toUpperCase()} / {money(order.total_cents)}</p>}<button className="button primary full" onClick={() => router.replace("/")}>Continue to home <ArrowRight size={16} /></button><p className="small muted">Returning home in {countdown} seconds</p></dialog></main>;
}
