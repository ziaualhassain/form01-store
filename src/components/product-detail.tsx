"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShieldCheck, Star, Truck, X, ZoomIn } from "lucide-react";
import type { Cart, Product, Variant } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";
import { categoryForType } from "./shop-catalogue";

const money = (amount: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount / 100);
const mockStoryImage = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85";

function ProductImage({ src, alt, sizes = "100vw", eager = false }: { src?: string | null; alt: string; sizes?: string; eager?: boolean }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? <Image src={src} alt={alt} fill unoptimized sizes={sizes} loading={eager ? "eager" : "lazy"} onError={() => setFailed(src)} /> : <span className="pdp-image-empty">{src ? "Image unavailable" : "FORM/01"}<small>{alt}</small></span>;
}

export default function ProductDetail({ product, products, cart, wishlist, loading, onAdd, onWishlist, onProduct, onBack, onCategory, backLabel = "Shop" }: {
  product: Product;
  products: Product[];
  cart: Cart | null;
  wishlist: string[];
  loading: boolean;
  onAdd: (variant: Variant, quantity: number) => Promise<void>;
  onWishlist: (product: Product) => void;
  onProduct: (product: Product) => void;
  onBack: () => void;
  backLabel?: string;
  onCategory: (type: string) => void;
}) {
  const variants = product.variants.filter((variant) => variant.status === "ACTIVE");
  const colors = isMockMode ? Array.from(new Map(variants.filter((variant) => variant.color).map((variant) => [variant.color?.name, variant.color])).values()).filter((color) => color !== undefined) : [];
  const [colorName, setColorName] = useState(colors[0]?.name || "");
  const visibleVariants = colors.length ? variants.filter((variant) => variant.color?.name === colorName) : variants;
  const [variantId, setVariantId] = useState(variants.find((variant) => variant.available > 0)?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const images = Array.from(new Set(product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []));
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const inBag = (id: string) => cart?.items.find((item) => item.variant_id === id)?.quantity || 0;
  const remaining = selectedVariant ? Math.max(0, selectedVariant.available - inBag(selectedVariant.id)) : 0;
  const safeQuantity = Math.min(quantity, Math.max(1, remaining));
  const amount = selectedVariant?.price_minor ?? (variants.length ? Math.min(...variants.map((variant) => variant.price_minor)) : null);
  const currency = selectedVariant?.currency || variants[0]?.currency || "INR";
  const saved = wishlist.includes(product.id);
  const related = products.filter((item) => item.status === "ACTIVE" && item.id !== product.id)
    .sort((a, b) => Number(categoryForType(b.product_type) === categoryForType(product.product_type)) - Number(categoryForType(a.product_type) === categoryForType(product.product_type))).slice(0, 6);
  const moveImage = (direction: number) => { if (images.length) setImageIndex((current) => (current + direction + images.length) % images.length); };

  useEffect(() => {
    if (zoomOpen) zoomDialog.current?.showModal();
    else zoomDialog.current?.close();
  }, [zoomOpen]);

  return <article className="product-page" aria-labelledby="product-title">
    <nav className="pdp-breadcrumbs" aria-label="Breadcrumb"><button onClick={onBack}>{backLabel}</button><ChevronRight size={12} />{product.product_type && <><button onClick={() => { if (product.product_type) onCategory(product.product_type); }}>{categoryForType(product.product_type)}</button><ChevronRight size={12} /></>}<span>{product.title}</span></nav>
    <div className="pdp-main">
      <section className="pdp-gallery" aria-label={`${product.title} gallery`}>
        {images.length > 1 && <div className="pdp-thumbnails">{images.map((image, index) => <button key={`${image}-${index}`} className={imageIndex === index ? "selected" : ""} aria-label={`Show product image ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}><ProductImage src={image} alt="" sizes="80px" /></button>)}</div>}
        <div className="pdp-main-image" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => {
          if (touchStart.current !== null) { const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 45) moveImage(distance > 0 ? 1 : -1); }
          touchStart.current = null;
        }}>
          <ProductImage src={images[imageIndex]} alt={`${product.title}, image ${imageIndex + 1}`} sizes="(max-width: 700px) 100vw, 60vw" eager />
          <button className="pdp-mobile-back" aria-label={`Back to ${backLabel.toLowerCase()}`} onClick={onBack}><ArrowLeft size={17} /></button>
          <span className="pdp-image-count" aria-live="polite">{images.length ? imageIndex + 1 : 0} / {images.length}</span>
          {images.length > 1 && <><button className="pdp-gallery-arrow previous" aria-label="Previous product image" onClick={() => moveImage(-1)}><ChevronLeft size={19} /></button><button className="pdp-gallery-arrow next" aria-label="Next product image" onClick={() => moveImage(1)}><ChevronRight size={19} /></button><div className="pdp-gallery-dots">{images.map((image, index) => <button key={`${image}-${index}`} aria-label={`Go to product image ${index + 1}`} aria-pressed={imageIndex === index} className={imageIndex === index ? "selected" : ""} onClick={() => setImageIndex(index)} />)}</div></>}
          {images.length > 0 && <button className="pdp-zoom" aria-label="Enlarge product image" onClick={() => setZoomOpen(true)}><ZoomIn size={20} /></button>}
        </div>
      </section>
      <section className="pdp-information" aria-label="Product options">
        {isMockMode && product.badge && <span className="pdp-badge">{product.badge}</span>}
        <h1 id="product-title">{product.title}</h1>
        <div className="pdp-price-rating"><p className="pdp-price">{amount === null ? "Price unavailable" : money(amount, currency)}</p>{isMockMode && <div className="pdp-rating" aria-label="Sample rating 4.8 out of 5, 124 reviews"><span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} fill="currentColor" />)}</span><small>4.8 (124 sample reviews)</small></div>}</div>
        {product.description && <p className="pdp-description">{product.description}</p>}
        {colors.length > 0 && <div className="pdp-colors"><span>Color: {colorName}</span><div role="group" aria-label="Choose color">{colors.map((color) => <button key={color.name} aria-label={color.name} aria-pressed={colorName === color.name} className={colorName === color.name ? "selected" : ""} style={{ backgroundColor: color.hex }} onClick={() => {
          setColorName(color.name);
          const match = variants.find((variant) => variant.color?.name === color.name && variant.title === selectedVariant?.title && variant.available > inBag(variant.id)) || variants.find((variant) => variant.color?.name === color.name && variant.available > inBag(variant.id));
          setVariantId(match?.id || ""); setQuantity(1);
        }} />)}</div></div>}
        <div className="pdp-size-heading"><span>Size</span><button onClick={() => setGuideOpen(!guideOpen)} aria-expanded={guideOpen}>Size &amp; Fit <ArrowRight size={14} /></button></div>
        {guideOpen && <div className="pdp-fit-help" role="note">{isMockMode ? "Demo fit: relaxed silhouette. Sample sizes are for preview only; measurements will be supplied with the published product." : "Choose from the published size options below. Detailed measurements are not available for this product yet."}</div>}
        <div className="pdp-sizes" role="group" aria-label="Choose size">{visibleVariants.map((variant) => <button key={variant.id} disabled={variant.available - inBag(variant.id) < 1 || loading} className={variantId === variant.id ? "selected" : ""} aria-pressed={variantId === variant.id} aria-label={`${variant.title || variant.sku}${variant.available - inBag(variant.id) < 1 ? ", unavailable" : ""}`} onClick={() => { setVariantId(variant.id); setQuantity(1); }}>{variant.title || variant.sku}</button>)}</div>
        {!variants.length && <p className="pdp-stock-message" role="status">No purchasable options are available.</p>}
        {variants.length > 0 && remaining < 1 && <p className="pdp-stock-message" role="status">This size is sold out or already at its available limit in your bag.</p>}
        <div className="pdp-quantity-row"><span>Quantity</span><div className="pdp-quantity"><button aria-label="Decrease quantity" disabled={safeQuantity <= 1 || loading} onClick={() => setQuantity(safeQuantity - 1)}><Minus size={15} /></button><output aria-label="Quantity" aria-live="polite">{safeQuantity}</output><button aria-label="Increase quantity" disabled={safeQuantity >= remaining || loading} onClick={() => setQuantity(safeQuantity + 1)}><Plus size={15} /></button></div></div>
        <div className="pdp-purchase"><button className="pdp-add" disabled={!selectedVariant || remaining < 1 || loading} onClick={() => { if (selectedVariant) void onAdd(selectedVariant, safeQuantity); }}>{loading ? "Adding..." : `Add to Cart${amount !== null ? ` - ${money(amount * safeQuantity, currency)}` : ""}`}</button><button className={`pdp-save ${saved ? "selected" : ""}`} aria-label={saved ? "Remove product from wishlist" : "Save product to wishlist"} aria-pressed={saved} onClick={() => onWishlist(product)}><Heart size={21} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button></div>
        <div className="pdp-assurances"><div><Truck size={23} strokeWidth={1.3} /><span>Thoughtful Essentials<small>Made for everyday journeys</small></span></div><div><ShieldCheck size={23} strokeWidth={1.3} /><span>{isMockMode ? "Demo Checkout" : "Secure Payments"}<small>{isMockMode ? "No real payments" : "Powered by Razorpay"}</small></span></div></div>
        <div className="pdp-accordions"><details><summary>Product Details <ChevronDown size={14} /></summary>{product.features.length ? <ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul> : <p>{product.description || "Further product details have not been published."}</p>}</details><details><summary>Size &amp; Fit <ChevronDown size={14} /></summary><p>Available sizes: {visibleVariants.map((variant) => variant.title || variant.sku).join(", ") || "None"}. {isMockMode ? "Sample product sizes for demonstration." : "Measurements and fit guidance have not yet been published."}</p></details><details><summary>Shipping &amp; Returns <ChevronDown size={14} /></summary><p>{isMockMode ? "This is a mock product. No orders, deliveries, or payments will be created." : "Delivery availability and charges are confirmed during checkout. Contact FORM/01 for the applicable return policy before ordering."}</p></details></div>
      </section>
    </div>
    {isMockMode && <section className="pdp-story" aria-labelledby="product-story-title"><div className="pdp-story-image"><ProductImage src={mockStoryImage} alt="Mountain landscape inspiring FORM/01" sizes="(max-width: 700px) 100vw, 50vw" /></div><div><span>The Story</span><h2 id="product-story-title">Built for higher grounds.</h2><p>A reminder to keep moving - in the city, on the trail, and within yourself. Thoughtful details and an everyday silhouette, inspired by a higher tomorrow.</p><details><summary>Read the Story <ArrowRight size={14} /></summary><p>Same spirit. A different form. This sample story previews the FORM/01 campaign experience. Real product stories will use published brand content.</p></details></div></section>}
    {related.length > 0 && <section className="pdp-related" aria-labelledby="related-title"><h2 id="related-title">You may also like</h2><div className="pdp-related-rail">{related.map((item) => {
      const active = item.variants.filter((variant) => variant.status === "ACTIVE");
      return <article key={item.id}><div className="pdp-related-photo"><button aria-label={`View related ${item.title}`} onClick={() => onProduct(item)}><ProductImage src={item.image_urls?.[0] || item.image_url} alt={item.title} sizes="(max-width: 700px) 40vw, 17vw" /></button><button className="pdp-related-save" aria-label={`${wishlist.includes(item.id) ? "Unsave" : "Save"} related ${item.title}`} aria-pressed={wishlist.includes(item.id)} onClick={() => onWishlist(item)}><Heart size={17} fill={wishlist.includes(item.id) ? "currentColor" : "none"} /></button></div><button className="pdp-related-title" onClick={() => onProduct(item)}>{item.title}</button><p>{active.length ? money(Math.min(...active.map((variant) => variant.price_minor)), active[0].currency) : "Price unavailable"}</p></article>;
    })}</div></section>}
    <dialog className="pdp-zoom-dialog" ref={zoomDialog} onCancel={() => setZoomOpen(false)} onClose={() => setZoomOpen(false)} aria-label="Enlarged product image"><button autoFocus aria-label="Close enlarged image" onClick={() => setZoomOpen(false)}><X size={24} /></button><div><ProductImage src={images[imageIndex]} alt={product.title} /></div></dialog>
  </article>;
}
