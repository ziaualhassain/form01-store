"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Diamond, Globe2, Leaf, Mountain } from "lucide-react";
import type { HomepageSection, Product } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";
import Link from "next/link";
import ShopCatalogue from "@/components/shop-catalogue";
import { catalogueCategories } from "@/lib/categories";

const mountainImage = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function imageUrl(value: unknown) {
  const url = text(value);
  return url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")) ? url : "";
}

function href(value: unknown, fallback = "#shop") {
  const url = text(value);
  return (url.startsWith("/") && !url.startsWith("//")) || url.startsWith("#") || url.startsWith("https://form01.com/") ? url : fallback;
}

function Photo({ src, mobile, alt = "", eager = false }: { src: string; mobile?: string; alt?: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState("");
  if (failedSource === src) return <span className="photo-unavailable">{alt || "Image unavailable"}</span>;
  // CDN assets are already transformed by the publisher; picture preserves the mobile art direction.
  return <picture>
    {mobile && <source media="(max-width: 640px)" srcSet={mobile} />}
    <Image src={src} alt={alt} fill unoptimized sizes="100vw" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} onError={() => setFailedSource(src)} />
  </picture>;
}

function RoundArrow() {
  return <span className="round-arrow"><ArrowRight size={13} strokeWidth={1.5} /></span>;
}

export default function DynamicHomepage({ sections, products, catalogueStatus, wishlist, onWishlist, onRetry, onProductType, onProduct, status }: {
  sections: HomepageSection[];
  products: Product[];
  catalogueStatus: "loading" | "live" | "unavailable";
  wishlist: string[];
  onWishlist: (product: Product) => void;
  onRetry: () => void;
  onProductType: (productType: string) => void;
  onProduct: (product: Product) => void;
  status: "loading" | "live" | "unavailable";
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [shopCategory, setShopCategory] = useState("All");
  const sorted = sections.slice().sort((left, right) => left.position - right.position);
  const heroes = sorted.filter((section) => section.type === "hero");
  const activeIndex = heroes.length ? slideIndex % heroes.length : 0;
  const hero = heroes[activeIndex]?.content;
  const heroImage = record(hero?.image);
  const heroCta = record(hero?.cta);
  const overlay = typeof hero?.overlay_opacity === "number" ? Math.min(.9, Math.max(.2, hero.overlay_opacity)) : .55;
  const collectionSections = sorted.filter((section) => section.type === "product_collection");
  const publishedProducts = collectionSections.flatMap((section) => section.products || []);
  const popularProducts = Array.from(new Map([...publishedProducts, ...products].filter((product) => product.status === "ACTIVE").map((product) => [product.id, product])).values()).slice(0, 4);
  const announcement = sorted.find((section) => section.type === "announcement");
  const categories = catalogueCategories(products, sections);

  return <div className="home-experience">
    {announcement && <div className="home-announcement">{text(announcement.content.text, text(announcement.content.title))}</div>}
    {(hero || isMockMode) && <section className="campaign-hero" aria-labelledby="campaign-title" aria-roledescription={heroes.length > 1 ? "carousel" : undefined}>
      <div className="campaign-photo" key={heroes[activeIndex]?.id || "preview"}>
        <Photo src={imageUrl(heroImage.desktop_url) || mountainImage} mobile={imageUrl(heroImage.mobile_url)} alt={text(heroImage.alt, "Mountain peaks beneath an evening sky")} eager />
      </div>
      <div className="campaign-shade" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${overlay}), transparent 90%), linear-gradient(0deg, rgba(0,0,0,.55), transparent 40%)` }} />
      <div className="campaign-copy" aria-live="polite">
        <span className="campaign-eyebrow">{hero ? text(hero.eyebrow) : "EST.01"}</span>
        <h1 id="campaign-title">{hero ? text(hero.title) : "Built beyond\ntrends."}</h1>
        <p>{hero ? text(hero.subtitle) : "Thoughtful essentials for everyday lives.\nInspired by mountains, silence and\na higher tomorrow."}</p>
        {(!hero || Boolean(heroCta.href)) && <a className="campaign-cta" href={href(heroCta.href)}>{text(heroCta.label, "Shop the Drop")} <ArrowRight size={15} /></a>}
      </div>
      <div className="campaign-bottom">
        <div className="slide-progress"><span>{String(activeIndex + 1).padStart(2, "0")} / {String(Math.max(heroes.length, 1)).padStart(2, "0")}</span><span className="slide-track"><span style={{ width: `${((activeIndex + 1) / Math.max(heroes.length, 1)) * 100}%` }} /></span></div>
        {heroes.length > 1 && <div className="slide-actions">
          <button aria-label="Previous campaign" onClick={() => setSlideIndex((activeIndex - 1 + heroes.length) % heroes.length)}><ArrowLeft size={16} /></button>
          <button aria-label="Next campaign" onClick={() => setSlideIndex((activeIndex + 1) % heroes.length)}><ArrowRight size={16} /></button>
        </div>}
      </div>
    </section>}
    {status === "unavailable" && <p className="content-notice" role="status">Published content is temporarily unavailable. Please refresh to try again.</p>}
    {status === "live" && !hero && <p className="content-notice" role="status">No campaign has been published yet.</p>}

    {categories.length > 0 && <section className="home-section category-section" aria-labelledby="categories-title">
      <div className="home-section-heading"><h2 id="categories-title">Shop by Category</h2><a href="#shop">View All <ArrowRight size={14} /></a></div>
      <div className="category-rail">{categories.map((category) => <button className="category-tile" key={category.type} onClick={() => onProductType(category.type)}>
        <span className="category-photo">{category.image ? <Photo src={category.image} mobile={category.mobile} alt={category.alt} /> : <span className="category-image-placeholder">FORM/01</span>}</span><span className="tile-shade" /><span className="category-name">{category.title}</span><RoundArrow />
      </button>)}</div>
    </section>}

    <section className="home-section popular-choices" aria-labelledby="popular-choices-title">
      <div className="home-section-heading"><h2 id="popular-choices-title">Popular Choices</h2><Link href="/shop">View All <ArrowRight size={14} /></Link></div>
      <ShopCatalogue collectionView products={popularProducts} status={popularProducts.length ? "live" : catalogueStatus} query="" category="All" onCategory={() => {}} wishlist={wishlist} onWishlist={onWishlist} onProduct={onProduct} onRetry={onRetry} />
    </section>

    <ShopCatalogue infiniteScroll products={products} status={catalogueStatus} query="" category={shopCategory} onCategory={setShopCategory} wishlist={wishlist} onWishlist={onWishlist} onProduct={onProduct} onRetry={onRetry} />

    <div>
      {sorted.filter((section) => section.type === "statement").map((section) => <section className="home-statement" key={section.id}><h2>{text(section.content.title)}</h2><p>{text(section.content.body)}</p></section>)}
    </div>
    <section className="benefit-strip" aria-label="Our principles">
      {[{ Icon: Mountain, title: "Thoughtful Design", copy: "Minimal, functional, timeless." }, { Icon: Diamond, title: "Premium Quality", copy: "Made to last, not for seasons." }, { Icon: Leaf, title: "Conscious Choices", copy: "Less excess. More intention." }, { Icon: Globe2, title: "A Higher Tomorrow", copy: "Thoughtful essentials, wherever you are." }].map(({ Icon, title, copy }) => <div key={title}><Icon size={32} strokeWidth={1} /><div><h3>{title}</h3><p>{copy}</p></div></div>)}
    </section>
  </div>;
}
