"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Heart, Leaf, Mountain, Package, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";
import { catalogueCategories, categoryForType } from "@/lib/categories";
export { categoryForType } from "@/lib/categories";

const normalize = (value?: string | null) => value?.trim().toUpperCase().replaceAll("_", "-").replaceAll(" ", "-") || "";

function price(product: Product) {
  const variants = product.variants.filter((variant) => variant.status === "ACTIVE");
  return variants.length ? Math.min(...variants.map((variant) => variant.price_minor)) : null;
}

function available(product: Product) {
  return product.variants.some((variant) => variant.status === "ACTIVE" && variant.available > 0);
}

function ProductPhoto({ product, index }: { product: Product; index: number }) {
  const image = product.image_urls?.[index] || product.image_url || product.image_urls?.[0];
  const [failedSource, setFailedSource] = useState("");
  return image && image !== failedSource ? <Image src={image} alt={product.title} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw" onError={() => setFailedSource(image)} /> : <span className="shop-image-placeholder">FORM/01<span>{image ? "Image unavailable" : product.title}</span></span>;
}

export default function ShopCatalogue({ products, status, query, category, onCategory, wishlist, onWishlist, onProduct, onRetry, collectionView = false, infiniteScroll = false }: {
  products: Product[];
  status: "loading" | "live" | "unavailable";
  query: string;
  category: string;
  onCategory: (category: string) => void;
  wishlist: string[];
  onWishlist: (product: Product) => void;
  onProduct: (product: Product) => void;
  onRetry: () => void;
  collectionView?: boolean;
  infiniteScroll?: boolean;
}) {
  const titleId = useId();
  const filtersId = useId();
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const [gender, setGender] = useState("ALL");
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [gallery, setGallery] = useState<Record<string, number>>({});
  const [page, setPage] = useState({ key: "", count: 12 });
  const sentinel = useRef<HTMLDivElement>(null);
  const liveProducts = products.filter((product) => product.status === "ACTIVE");
  const categories = ["All", ...catalogueCategories(products).map((item) => item.key)];
  const invalidPrice = (minPrice !== "" && (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)) || (maxPrice !== "" && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)) || (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice));
  const filtered = liveProducts.filter((product) => {
    const amount = price(product);
    return (category === "All" || categoryForType(product.product_type) === category)
      && (gender === "ALL" || normalize(product.gender) === gender)
      && (!inStock || available(product))
      && `${product.title} ${product.description || ""} ${product.product_type || ""}`.toLowerCase().includes(query.trim().toLowerCase())
      && (minPrice === "" || (amount !== null && amount >= Number(minPrice) * 100))
      && (maxPrice === "" || (amount !== null && amount <= Number(maxPrice) * 100));
  });
  if (sort === "price-low") filtered.sort((a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity));
  if (sort === "price-high") filtered.sort((a, b) => (price(b) ?? -Infinity) - (price(a) ?? -Infinity));
  if (sort === "name") filtered.sort((a, b) => a.title.localeCompare(b.title));
  const filterCount = Number(category !== "All") + Number(gender !== "ALL") + Number(inStock) + Number(minPrice !== "" || maxPrice !== "");
  const clearFilters = () => { setGender("ALL"); setInStock(false); setMinPrice(""); setMaxPrice(""); onCategory("All"); };
  const closeFilters = () => { setFiltersOpen(false); filterToggle.current?.focus(); };
  const activeFilters = [
    ...(category !== "All" ? [{ label: categoryForType(category).toLowerCase().replaceAll("-", " "), remove: () => onCategory("All") }] : []),
    ...(gender !== "ALL" ? [{ label: gender.toLowerCase(), remove: () => setGender("ALL") }] : []),
    ...(minPrice !== "" || maxPrice !== "" ? [{ label: `INR ${minPrice || "0"} - ${maxPrice || "any"}`, remove: () => { setMinPrice(""); setMaxPrice(""); } }] : []),
    ...(inStock ? [{ label: "In stock", remove: () => setInStock(false) }] : []),
  ];
  const pageKey = JSON.stringify([query, category, gender, inStock, minPrice, maxPrice, sort]);
  if (page.key !== pageKey) setPage({ key: pageKey, count: 12 });
  const visibleCount = page.key === pageKey ? page.count : 12;
  const visibleProducts = infiniteScroll ? filtered.slice(0, visibleCount) : filtered;
  const hasMore = infiniteScroll && visibleProducts.length < filtered.length;
  const loadMore = () => setPage((current) => ({ key: pageKey, count: Math.min((current.key === pageKey ? current.count : 12) + 12, filtered.length) }));
  useEffect(() => {
    if (!hasMore || status !== "live" || !sentinel.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        setPage((current) => ({ key: pageKey, count: Math.min((current.key === pageKey ? current.count : 12) + 12, filtered.length) }));
      }
    }, { rootMargin: "300px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, status, pageKey, visibleCount, filtered.length]);
  const Heading = infiniteScroll ? "h2" : "h1";

  return <section className={`shop-catalogue ${collectionView ? "collection-catalogue" : ""}`} id={collectionView ? undefined : "shop"} aria-label={collectionView ? "Collection products" : undefined} aria-labelledby={collectionView ? undefined : titleId}>
    {!collectionView && <><div className="shop-intro"><span>Shop</span><Heading id={titleId}>Thoughtful pieces<br />for everyday lives.</Heading><p>Minimal design. Functional details. Made to last.</p></div>
    <div className="shop-toolbar">
      <div className="shop-categories" role="group" aria-label="Product categories">{categories.map((label) => <button key={label} className={category === label ? "selected" : ""} aria-pressed={category === label} onClick={() => onCategory(label)}>{label === label.toUpperCase() ? label.toLowerCase().replaceAll("-", " ") : label}</button>)}</div>
      <div className="shop-controls">
        <label className="shop-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="name">Name: A-Z</option></select><ChevronDown size={14} aria-hidden="true" /></label>
        <button ref={filterToggle} className={`shop-filter-toggle ${filterCount ? "has-filters" : ""}`} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /> Filters{filterCount > 0 && <span>{filterCount}</span>}</button>
      </div>
    </div></>}
    {filtersOpen && <div className="shop-filter-panel" id={filtersId} role="region" aria-label="Refine products" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closeFilters(); } }}>
      <div className="shop-filter-heading"><div><span>THE DETAILS MATTER</span><h3>Refine your selection</h3><p>Find the pieces that fit your everyday.</p></div><button className="shop-filter-close" aria-label="Close filters" onClick={closeFilters}><X size={18} /></button></div>
      <div className="shop-filter-fields">
      <label htmlFor={`${filtersId}-gender`}>Gender<span className="shop-select-wrap"><select id={`${filtersId}-gender`} aria-label="Gender" value={gender} onChange={(event) => setGender(event.target.value)}><option value="ALL">All genders</option><option value="MEN">Men</option><option value="WOMEN">Women</option><option value="UNISEX">Unisex</option></select><ChevronDown size={14} aria-hidden="true" /></span></label>
      <label>Min price (INR)<input type="number" min="0" step="1" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" aria-invalid={invalidPrice} aria-describedby={invalidPrice ? `${filtersId}-error` : undefined} /></label>
      <label>Max price (INR)<input type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No limit" aria-invalid={invalidPrice} aria-describedby={invalidPrice ? `${filtersId}-error` : undefined} /></label>
      <label className="stock-filter"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> In stock only</label>
      </div>
      {invalidPrice && <p className="shop-filter-error" id={`${filtersId}-error`} role="alert">Enter a valid price range. Minimum must not exceed maximum.</p>}
      <div className="shop-filter-footer"><button className="shop-clear" onClick={clearFilters} disabled={!filterCount}>Reset all</button><span>Updates as you choose</span><button className="shop-filter-done" onClick={closeFilters}>View products</button></div>
    </div>}
    {!collectionView && activeFilters.length > 0 && <div className="shop-active-filters" role="group" aria-label="Active filters">{activeFilters.map((filter) => <button key={filter.label} onClick={filter.remove} aria-label={`Remove ${filter.label} filter`}>{filter.label}<X size={12} aria-hidden="true" /></button>)}<button className="shop-clear" onClick={clearFilters}>Clear all</button></div>}
    <div className="shop-results-summary" role="status">{status === "live" ? `${filtered.length} ${filtered.length === 1 ? "product" : "products"}${query ? ` matching "${query}"` : ""}` : status === "loading" ? "Loading products..." : "Catalogue unavailable"}</div>
    {status === "unavailable" ? <div className="shop-empty"><h2>We couldn&apos;t load the shop.</h2><p>Please try again to see the latest products.</p><button onClick={onRetry}>Try again</button></div> : status === "loading" ? <div className="shop-loading-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div> : filtered.length === 0 ? <div className="shop-empty"><h2>{collectionView ? "The next chapter is taking shape." : "No pieces found."}</h2><p>{collectionView ? "Pieces for this drop have not been published yet. Explore another collection while you wait." : query ? "Try a different search or clear your filters." : "Try another category or check back for the next drop."}</p>{!collectionView && <button onClick={clearFilters}>Clear filters</button>}</div> : <div className="shop-product-grid">{visibleProducts.map((product) => {
      const amount = price(product);
      const currency = product.variants.find((variant) => variant.status === "ACTIVE")?.currency || "INR";
      const saved = wishlist.includes(product.id);
      return <article className="shop-product" key={product.id}>
        <div className="shop-product-photo">
          <button className="shop-product-open" onClick={() => onProduct(product)} aria-label={`View ${product.title}`}><ProductPhoto product={product} index={gallery[product.id] || 0} /></button>
          {(!available(product) || (isMockMode && product.badge)) && <span className="shop-stock-badge">{!available(product) ? "Sold out" : product.badge}</span>}
          <button className={`shop-wishlist ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${product.title}${saved ? " from wishlist" : " to wishlist"}`} aria-pressed={saved} onClick={() => onWishlist(product)}><Heart size={21} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button>
        </div>
        <div className="shop-product-info"><button className="shop-product-title" onClick={() => onProduct(product)}>{product.title}</button><p>{amount === null ? "Price unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount / 100)}</p><button className="shop-quick-add" onClick={() => onProduct(product)} aria-label={`Choose options for ${product.title}`}><Plus size={18} strokeWidth={1.5} /></button></div>
        {product.image_urls?.length > 1 && <div className="shop-image-options" role="group" aria-label={`${product.title} images`}>{product.image_urls.map((image, index) => <button key={`${image}-${index}`} onClick={() => setGallery((current) => ({ ...current, [product.id]: index }))} aria-label={`View image ${index + 1} of ${product.title}`} aria-pressed={(gallery[product.id] || 0) === index} className={(gallery[product.id] || 0) === index ? "selected" : ""}><Image src={image} alt="" width={12} height={12} unoptimized /></button>)}</div>}
      </article>;
    })}</div>}
    {infiniteScroll && status === "live" && filtered.length > 0 && <div className="shop-pagination" ref={sentinel}>
      <p role="status">Showing {visibleProducts.length} of {filtered.length} products{hasMore ? "" : " - you've seen them all."}</p>
      {hasMore && <button onClick={loadMore}>Load more products</button>}
    </div>}
    {!collectionView && !infiniteScroll && <section className="shop-principles" aria-label="FORM/01 principles">
      {[{ Icon: Leaf, title: "Thoughtful Design", copy: "Minimal, functional, timeless." }, { Icon: Mountain, title: "Premium Quality", copy: "Made to last, not for seasons." }, { Icon: Package, title: "Considered Details", copy: "Purpose in every piece." }, { Icon: RotateCcw, title: "Everyday Essentials", copy: "Made to return to." }].map(({ Icon, title, copy }) => <div key={title}><Icon size={29} strokeWidth={1} /><div><h2>{title}</h2><p>{copy}</p></div></div>)}
    </section>}
  </section>;
}
