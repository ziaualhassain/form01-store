"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Heart, Leaf, Mountain, Package, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";

const categoryTypes: Record<string, string[]> = {
  Hoodies: ["HOODIE", "HOODIES", "OVERSIZED-HOODIE"],
  Sweatshirts: ["SWEATSHIRT", "SWEATSHIRTS", "OVERSIZED-SWEATSHIRT"],
  Tees: ["TEE", "TEES", "T-SHIRT", "TSHIRT", "SHIRT", "OVERSIZED-SHIRT"],
  Caps: ["CAP", "CAPS"],
  Accessories: ["ACCESSORY", "ACCESSORIES", "TUMBLER", "BOTTLE", "BAG"],
  Books: ["BOOK", "BOOKS", "NOTEBOOK"],
  Essentials: ["ESSENTIAL", "ESSENTIALS"],
};

const normalize = (value?: string | null) => value?.trim().toUpperCase().replaceAll("_", "-").replaceAll(" ", "-") || "";
export function categoryForType(value?: string | null) {
  const type = normalize(value);
  return Object.keys(categoryTypes).find((label) => categoryTypes[label].includes(type)) || type;
}

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

export default function ShopCatalogue({ products, status, query, category, onCategory, wishlist, onWishlist, onProduct, onRetry, collectionView = false }: {
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
}) {
  const titleId = useId();
  const filtersId = useId();
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gender, setGender] = useState("ALL");
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [gallery, setGallery] = useState<Record<string, number>>({});
  const liveProducts = products.filter((product) => product.status === "ACTIVE");
  const extraCategories = Array.from(new Set(liveProducts.map((product) => categoryForType(product.product_type)).filter((type) => type && !(type in categoryTypes))));
  const categories = ["All", ...Object.keys(categoryTypes), ...extraCategories];
  if (category !== "All" && !categories.includes(category)) categories.push(category);
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
  const filterCount = Number(gender !== "ALL") + Number(inStock) + Number(minPrice !== "" || maxPrice !== "");
  const clearFilters = () => { setGender("ALL"); setInStock(false); setMinPrice(""); setMaxPrice(""); onCategory("All"); };

  return <section className={`shop-catalogue ${collectionView ? "collection-catalogue" : ""}`} id={collectionView ? undefined : "shop"} aria-label={collectionView ? "Collection products" : undefined} aria-labelledby={collectionView ? undefined : titleId}>
    {!collectionView && <><div className="shop-intro"><span>Shop</span><h1 id={titleId}>Thoughtful pieces<br />for everyday lives.</h1><p>Minimal design. Functional details. Made to last.</p></div>
    <div className="shop-toolbar">
      <div className="shop-categories" role="group" aria-label="Product categories">{categories.map((label) => <button key={label} className={category === label ? "selected" : ""} aria-pressed={category === label} onClick={() => onCategory(label)}>{label === label.toUpperCase() ? label.toLowerCase().replaceAll("-", " ") : label}</button>)}</div>
      <div className="shop-controls">
        <label className="shop-sort">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="name">Name: A-Z</option></select></label>
        <button className={`shop-filter-toggle ${filterCount ? "has-filters" : ""}`} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /> Filters{filterCount > 0 && <span>{filterCount}</span>}</button>
      </div>
    </div></>}
    {filtersOpen && <div className="shop-filter-panel" id={filtersId}>
      <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="ALL">All genders</option><option value="MEN">Men</option><option value="WOMEN">Women</option><option value="UNISEX">Unisex</option></select></label>
      <label>Min price (INR)<input type="number" min="0" step="1" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></label>
      <label>Max price (INR)<input type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No limit" /></label>
      <label className="stock-filter"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> In stock only</label>
      <button className="shop-clear" onClick={clearFilters}>Clear filters</button>
      <button className="shop-filter-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} /></button>
      {invalidPrice && <p className="shop-filter-error" role="alert">Enter a valid price range. Minimum must not exceed maximum.</p>}
    </div>}
    <div className="shop-results-summary" role="status">{status === "live" ? `${filtered.length} ${filtered.length === 1 ? "product" : "products"}${query ? ` matching "${query}"` : ""}` : status === "loading" ? "Loading products..." : "Catalogue unavailable"}</div>
    {status === "unavailable" ? <div className="shop-empty"><h2>We couldn&apos;t load the shop.</h2><p>Please try again to see the latest products.</p><button onClick={onRetry}>Try again</button></div> : status === "loading" ? <div className="shop-loading-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div> : filtered.length === 0 ? <div className="shop-empty"><h2>{collectionView ? "The next chapter is taking shape." : "No pieces found."}</h2><p>{collectionView ? "Pieces for this drop have not been published yet. Explore another collection while you wait." : query ? "Try a different search or clear your filters." : "Try another category or check back for the next drop."}</p>{!collectionView && <button onClick={clearFilters}>Clear filters</button>}</div> : <div className="shop-product-grid">{filtered.map((product) => {
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
    {!collectionView && <section className="shop-principles" aria-label="FORM/01 principles">
      {[{ Icon: Leaf, title: "Thoughtful Design", copy: "Minimal, functional, timeless." }, { Icon: Mountain, title: "Premium Quality", copy: "Made to last, not for seasons." }, { Icon: Package, title: "Considered Details", copy: "Purpose in every piece." }, { Icon: RotateCcw, title: "Everyday Essentials", copy: "Made to return to." }].map(({ Icon, title, copy }) => <div key={title}><Icon size={29} strokeWidth={1} /><div><h2>{title}</h2><p>{copy}</p></div></div>)}
    </section>}
  </section>;
}
