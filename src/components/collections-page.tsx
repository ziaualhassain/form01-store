"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Circle, Leaf, Mountain, Sun } from "lucide-react";
import type { HomepageSection, Product } from "@/lib/api";
import ShopCatalogue from "./shop-catalogue";

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function imageUrl(value: unknown) { const url = text(value); return url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")) ? url : ""; }

export function countdownParts(launchAt: string, now: number) {
  const target = Date.parse(launchAt);
  if (!Number.isFinite(target)) return null;
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, mins: Math.floor(seconds / 60) % 60, secs: seconds % 60, launched: target <= now };
}

function LaunchCountdown({ launchAt }: { launchAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [launchAt]);
  const parts = now === null ? null : countdownParts(launchAt, now);
  if (now !== null && !parts) return <p className="collection-launch-note" role="status">Launch date to be announced.</p>;
  if (parts?.launched) return <p className="collection-launch-note">The drop is here.</p>;
  return <div className="collection-countdown" role="timer" aria-label="Time until collection launch">{(["days", "hours", "mins", "secs"] as const).map((unit) => <div key={unit}><strong>{parts ? String(parts[unit]).padStart(2, "0") : "--"}</strong><span>{unit}</span></div>)}</div>;
}

function CollectionPhoto({ desktop, mobile, alt }: { desktop: string; mobile: string; alt: string }) {
  const [failed, setFailed] = useState("");
  return desktop && failed !== desktop ? <picture>{mobile && <source media="(max-width: 640px)" srcSet={mobile} />}<Image src={desktop} alt={alt} fill unoptimized sizes="100vw" loading="eager" fetchPriority="high" onError={() => setFailed(desktop)} /></picture> : <div className="collection-image-empty">{desktop ? "Campaign image unavailable" : "FORM/01"}</div>;
}

export default function CollectionsPage({ sections, products, status, catalogueStatus, wishlist, onWishlist, onProduct, onNotify, onRetry, selectedId, onDrop }: {
  sections: HomepageSection[];
  products: Product[];
  status: "loading" | "live" | "unavailable";
  catalogueStatus: "loading" | "live" | "unavailable";
  wishlist: string[];
  onWishlist: (product: Product) => void;
  onProduct: (product: Product) => void;
  onNotify: () => void;
  onRetry: () => void;
  selectedId: string;
  onDrop: (id: string) => void;
}) {
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const panelId = useId();
  const drops = sections.filter((section) => section.type === "product_collection").slice().sort((a, b) => a.position - b.position);
  const active = drops.find((section) => section.id === selectedId) || drops[0];
  const content = active?.content || {};
  const campaign = record(content.campaign);
  const image = record(campaign.image || content.image);
  const launchAt = text(campaign.launch_at);
  const explicitSlugs = Array.isArray(content.product_slugs) ? content.product_slugs.filter((slug): slug is string => typeof slug === "string") : [];
  const collectionProducts = active?.products !== undefined ? active.products.map((published) => products.find((product) => product.id === published.id) || published) : products.filter((product) => {
    if (explicitSlugs.length) return explicitSlugs.includes(product.slug);
    const hasFilter = Boolean(content.theme || content.product_type || content.gender);
    return hasFilter && (!content.theme || product.theme === content.theme) && (!content.product_type || product.product_type === content.product_type) && (!content.gender || product.gender === content.gender);
  });

  if (status === "loading") return <section className="collection-empty" aria-busy="true"><span className="campaign-eyebrow">Collections</span><h1>Every drop begins with a story.</h1><p role="status">Loading collections...</p></section>;
  if (status === "unavailable") return <section className="collection-empty"><h1>The next chapter is waiting.</h1><p role="status">We couldn&apos;t load the published collections.</p><button onClick={onRetry}>Try again</button></section>;
  if (!active) return <section className="collection-empty"><span className="campaign-eyebrow">Collections</span><h1>Something thoughtful is taking shape.</h1><p>No collections have been published yet.</p><Link href="/shop">Explore the shop <ArrowRight size={15} /></Link></section>;

  return <div className="collections-experience">
    <section className="collection-hero" aria-labelledby="collection-title">
      <CollectionPhoto key={active.id} desktop={imageUrl(image.desktop_url)} mobile={imageUrl(image.mobile_url)} alt={text(image.alt, text(content.title))} />
      <div className="collection-hero-shade" />
      <div className="collection-hero-copy">
        <span className="collection-eyebrow">{text(campaign.eyebrow, text(content.tile_label, "FORM/01 Collection"))}</span>
        <h1 id="collection-title">{text(content.title, "The Collection")}</h1>
        {campaign.headline ? <h2>{text(campaign.headline)}</h2> : null}
        <p>{text(campaign.description, text(content.description))}</p>
        {launchAt && <LaunchCountdown key={`${active.id}-${launchAt}`} launchAt={launchAt} />}
        <button className="collection-notify" onClick={onNotify}>{text(campaign.cta_label, "Join the Journey")} <ArrowRight size={15} /></button>
      </div>
      {campaign.location ? <span className="collection-location">{text(campaign.location)}</span> : null}
    </section>
    <div className="collection-drop-tabs" role="tablist" aria-label="Collection drops">{drops.map((drop) => <button key={drop.id} id={`${panelId}-drop-${drop.id}`} role="tab" aria-selected={drop.id === active.id} aria-controls={panelId} tabIndex={drop.id === active.id ? 0 : -1} onClick={() => { onDrop(drop.id); setLookbookOpen(false); }} onKeyDown={(event) => {
      const index = drops.findIndex((drop) => drop.id === active.id);
      const next = event.key === "ArrowRight" ? (index + 1) % drops.length : event.key === "ArrowLeft" ? (index - 1 + drops.length) % drops.length : event.key === "Home" ? 0 : event.key === "End" ? drops.length - 1 : null;
      if (next !== null) { event.preventDefault(); onDrop(drops[next].id); setLookbookOpen(false); document.getElementById(`${panelId}-drop-${drops[next].id}`)?.focus(); }
    }}>{text(record(drop.content.campaign).tab_label, text(drop.content.title))}</button>)}</div>
    <section className="collection-body" role="tabpanel" id={panelId} aria-labelledby={`${panelId}-drop-${active.id}`}>
      <div className="collection-heading"><h2>The Collection</h2><p>{text(campaign.collection_description, text(content.description))}</p><button onClick={() => setLookbookOpen(!lookbookOpen)} aria-expanded={lookbookOpen}>View Lookbook <ArrowRight size={14} /></button></div>
      {lookbookOpen && <div className="collection-lookbook"><h3>{text(content.title)} / Lookbook</h3><p>{text(campaign.description, text(content.description))}</p><div>{collectionProducts.filter((product) => product.image_urls?.[0] || product.image_url).map((product) => <button key={product.id} onClick={() => onProduct(product)} aria-label={`Explore ${product.title}`}><Image src={product.image_urls?.[0] || product.image_url || ""} alt={product.title} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" /><span>{product.title}</span></button>)}</div>{!collectionProducts.length && <p>Lookbook images have not been published for this drop yet.</p>}</div>}
      <ShopCatalogue key={active.id} collectionView products={collectionProducts} status={active.products !== undefined ? "live" : catalogueStatus} query="" category="All" onCategory={() => {}} wishlist={wishlist} onWishlist={onWishlist} onProduct={onProduct} onRetry={onRetry} />
      <div className="collection-principles">{[{ Icon: Leaf, title: "Thoughtful Design", text: "Minimal, functional, timeless." }, { Icon: Mountain, title: "Premium Quality", text: "Made to last, not for seasons." }, { Icon: Circle, title: "Considered Drops", text: "Every collection has a purpose." }, { Icon: Sun, title: "A Higher Tomorrow", text: "Same spirit. A different form." }].map(({ Icon, title, text }) => <div key={title}><Icon size={28} strokeWidth={1} /><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>
    </section>
  </div>;
}
