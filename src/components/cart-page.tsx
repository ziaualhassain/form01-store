"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Minus, Package, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import { apiErrorMessage, storeApi, type Cart, type CartItem, type CheckoutQuote, type Product } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";
import ShopCatalogue from "./shop-catalogue";

const money = (minor: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);
function CartPhoto({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? <Image src={src} alt={title} fill unoptimized sizes="(max-width: 640px) 85px, 110px" onError={() => setFailed(src)} /> : <span className="bag-photo-placeholder">FORM/01</span>;
}

export default function CartPage({ cart, products, status, catalogueStatus, busy, wishlist, onWishlist, onProduct, onQuantity, onCheckout, onRetry, onSignIn }: {
  cart: Cart | null;
  products: Product[];
  status: "loading" | "ready" | "unavailable" | "signed-out";
  catalogueStatus: "loading" | "live" | "unavailable";
  busy: boolean;
  wishlist: string[];
  onWishlist: (product: Product) => void;
  onProduct: (product: Product) => void;
  onQuantity: (item: CartItem, quantity: number) => Promise<void>;
  onCheckout: () => void;
  onRetry: () => void;
  onSignIn: () => void;
}) {
  const discountId = useId();
  const [discountMessage, setDiscountMessage] = useState("");
  const [quoteResult, setQuoteResult] = useState<{ cart: Cart; quote?: CheckoutQuote; error?: string } | null>(null);
  const [retryQuote, setRetryQuote] = useState(0);
  const quantity = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  useEffect(() => {
    if (isMockMode || !cart?.items.length || status !== "ready") return;
    let cancelled = false;
    storeApi.quote().then(
      (quote) => { if (!cancelled) setQuoteResult({ cart, quote }); },
      (error: unknown) => { if (!cancelled) setQuoteResult({ cart, error: apiErrorMessage(error) }); },
    );
    return () => { cancelled = true; };
  }, [cart, status, retryQuote]);
  const quote = quoteResult?.cart === cart ? quoteResult?.quote : undefined;
  const quoteError = quoteResult?.cart === cart ? quoteResult?.error : undefined;
  const currency = quote?.currency || cart?.currency || "INR";
  const cartProducts = products.filter((product) => product.variants.some((variant) => cart?.items.some((item) => item.variant_id === variant.id)));
  const recommendations = products.filter((product) => product.status === "ACTIVE" && !cartProducts.some((item) => item.id === product.id)).slice(0, 4);
  const unavailableItems = cart?.items.some((item) => !products.some((product) => product.variants.some((variant) => variant.id === item.variant_id))) || false;

  return <section className="bag-page" aria-labelledby="bag-title">
    <header className="bag-heading"><div><span>Shopping Cart</span><h1 id="bag-title">Your Cart ({quantity})</h1><p>Intentional pieces for what&apos;s next.</p></div><Link href="/shop">Continue Shopping <ArrowRight size={14} /></Link></header>
    {status !== "ready" ? <div className="bag-empty" role="status"><ShoppingBag size={32} /><h2>{status === "loading" ? "Loading your cart..." : status === "signed-out" ? "Your next chapter is waiting." : "We couldn't load your cart."}</h2><p>{status === "signed-out" ? "Sign in to view your saved cart." : status === "unavailable" ? "Please try again. No items have been changed." : "Checking your latest pieces and stock."}</p>{status !== "loading" && <button onClick={status === "signed-out" ? onSignIn : onRetry}>{status === "signed-out" ? "Sign in" : "Try again"}</button>}</div> : !quantity ? <div className="bag-empty"><ShoppingBag size={32} /><h2>A little room for possibility.</h2><p>Your cart is empty. Find your next everyday essential.</p><Link href="/shop">Explore the shop <ArrowRight size={14} /></Link></div> : <div className="bag-layout">
      <div className="bag-main"><div className="bag-table-head" aria-hidden="true"><span>Product</span><span>Price</span><span>Quantity</span><span>Total</span><span /></div>
        <div className="bag-lines">{cart?.items.map((item) => {
          const product = products.find((product) => product.variants.some((variant) => variant.id === item.variant_id));
          const variant = product?.variants.find((variant) => variant.id === item.variant_id);
          const inStock = variant?.status === "ACTIVE" && item.available_quantity >= item.quantity;
          return <article className="bag-line" key={item.id} aria-label={product?.title || "Unavailable product"}>
            <div className="bag-product"><button className="bag-photo" disabled={!product} onClick={() => product && onProduct(product)} aria-label={`View ${product?.title || "unavailable product"}`}><CartPhoto src={product?.image_urls?.[0] || product?.image_url} title={product?.title || "Product unavailable"} /></button><div><button className="bag-product-name" disabled={!product} onClick={() => product && onProduct(product)}>{product?.title || "Product details unavailable"}</button><p>{isMockMode && variant?.color ? `${variant.color.name} | ` : ""}{variant?.title || item.variant_id}</p><span className={`bag-stock ${inStock ? "in-stock" : ""}`}>{inStock ? "In Stock" : variant ? "Check availability" : "Details unavailable"}</span></div></div>
            <span className="bag-unit-price">{variant ? money(variant.price_minor, variant.currency) : "Unavailable"}</span>
            <div className="bag-quantity" role="group" aria-label={`Quantity for ${product?.title || item.variant_id}`}><button disabled={busy || item.quantity <= 1} onClick={() => void onQuantity(item, item.quantity - 1)} aria-label={`Decrease ${product?.title || "item"} quantity`}><Minus size={13} /></button><output aria-live="polite">{item.quantity}</output><button disabled={busy || !variant || variant.status !== "ACTIVE" || item.quantity >= Math.min(item.available_quantity, 100)} onClick={() => void onQuantity(item, item.quantity + 1)} aria-label={`Increase ${product?.title || "item"} quantity`}><Plus size={13} /></button></div>
            <strong className="bag-line-total">{variant ? money(variant.price_minor * item.quantity, variant.currency) : "Unavailable"}</strong>
            <button className="bag-remove" disabled={busy} onClick={() => void onQuantity(item, 0)} aria-label={`Remove ${product?.title || "item"} from cart`}><Trash2 size={15} strokeWidth={1.5} /></button>
          </article>;
        })}</div>
        <form className="bag-discount" onSubmit={(event) => { event.preventDefault(); setDiscountMessage("Discount codes are not supported by the current checkout service. No discount has been applied."); }}><label htmlFor={discountId}><Tag size={19} strokeWidth={1.5} />Have a discount code?</label><input id={discountId} name="discount" placeholder="Enter code (e.g. FORM01)" required /><button type="submit">Apply</button>{discountMessage && <p role="status">{discountMessage}</p>}</form>
      </div>
      <aside className="bag-sidebar"><section className="bag-summary"><h2>Order Summary</h2><dl><div><dt>Subtotal ({quantity} {quantity === 1 ? "item" : "items"})</dt><dd>{money(quote?.subtotal_minor ?? cart?.subtotal_minor ?? 0, currency)}</dd></div><div><dt>Shipping</dt><dd>{isMockMode ? "Demo only" : quote ? money(quote.shipping_minor, currency) : "Pending"}</dd></div>{quote && quote.discount_minor > 0 && <div><dt>Discount</dt><dd>−{money(quote.discount_minor, currency)}</dd></div>}{quote && quote.tax_minor > 0 && <div><dt>Tax</dt><dd>{money(quote.tax_minor, currency)}</dd></div>}</dl><p className="bag-summary-note">{isMockMode ? "Sample cart. Shipping and payment are not processed." : "Shipping and tax reflect the current checkout quote."}</p><div className="bag-grand-total"><strong>{isMockMode ? "Demo total" : "Total"}</strong><strong>{isMockMode ? money(cart?.total_minor || 0, currency) : quote ? money(quote.total_minor, currency) : "Pending"}</strong></div>{!isMockMode && !quote && <p role={quoteError ? "alert" : "status"} className="bag-quote-status">{quoteError || "Calculating your checkout total..."}{quoteError && <button onClick={() => setRetryQuote((value) => value + 1)}>Retry quote</button>}</p>}{unavailableItems && <p className="bag-quote-status" role="status">Some product details are unavailable. Refresh the shop before checking out.</p>}<button className="bag-checkout" disabled={busy || (!isMockMode && (!quote || unavailableItems))} onClick={onCheckout}>{busy ? "Updating..." : "Proceed to Checkout"} <ArrowRight size={16} /></button><div className="bag-assurances"><div><Truck size={21} strokeWidth={1.2} /><span>Delivery</span><small>Quoted at checkout</small></div><div><Package size={21} strokeWidth={1.2} /><span>Considered Pieces</span><small>Everyday essentials</small></div><div><ShieldCheck size={21} strokeWidth={1.2} /><span>Payments</span><small>{isMockMode ? "Disabled in preview" : "Razorpay checkout"}</small></div></div></section>
        <div className="bag-information"><details><summary><Truck size={16} />Shipping Information <ChevronRight size={15} /></summary><p>Available delivery options and charges are confirmed by the checkout service. No free-shipping threshold has been configured.</p></details><details><summary><Package size={16} />Returns &amp; Exchanges <ChevronRight size={15} /></summary><p>A returns and exchanges policy has not been published yet. No return window is promised here.</p></details></div>
      </aside>
      {(recommendations.length > 0 || catalogueStatus !== "live") && <section className="bag-recommendations"><div className="home-section-heading"><h2>You may also like</h2><Link href="/shop">View All <ArrowRight size={14} /></Link></div><ShopCatalogue collectionView products={recommendations} status={catalogueStatus} query="" category="All" onCategory={() => {}} wishlist={wishlist} onWishlist={onWishlist} onProduct={onProduct} onRetry={onRetry} /></section>}
    </div>}
  </section>;
}
