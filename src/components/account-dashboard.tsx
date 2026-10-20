"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, CircleHelp, CreditCard, Heart, Home, LogOut, MapPin, Package, Pencil, UserRound } from "lucide-react";
import type { Address, Order, Product, Profile } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";
import OrderHistory from "./order-history";

const navigation = [
  { label: "Overview", Icon: Home }, { label: "Orders", Icon: Package },
  { label: "Addresses", Icon: MapPin }, { label: "Wishlist", Icon: Heart },
  { label: "Payment Methods", Icon: CreditCard }, { label: "Account Details", Icon: UserRound },
  { label: "Notifications", Icon: Bell }, { label: "Support", Icon: CircleHelp },
];

function Thumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? <Image src={src} alt={alt} fill unoptimized sizes="100px" onError={() => setFailed(src)} /> : <span className="account-photo-placeholder">F/01</span>;
}

export default function AccountDashboard({ profile, orders, addresses, products, wishlist, status, onRetry, onRefreshOrders, onSignIn, onEdit, onAddAddress, onLogout, onProduct, onWishlist }: {
  profile: Profile | null;
  orders: Order[];
  addresses: Address[];
  products: Product[];
  wishlist: string[];
  status: "loading" | "ready" | "unavailable" | "signed-out";
  onRetry: () => void;
  onRefreshOrders: () => void;
  onSignIn: () => void;
  onEdit: () => void;
  onAddAddress: () => void;
  onLogout: () => void;
  onProduct: (product: Product) => void;
  onWishlist: (product: Product) => void;
}) {
  const [section, setSection] = useState("Overview");
  const savedProducts = products.filter((product) => wishlist.includes(product.id));
  const remoteWishlist = (profile?.wishlist || []).filter((item) => !savedProducts.some((product) => product.id === item.product_id));
  const wishlistCount = new Set([...wishlist, ...(profile?.wishlist || []).map((item) => item.product_id)]).size;
  const name = profile?.display_name || profile?.first_name || "there";
  const show = (label: string) => { setSection(label); window.scrollTo({ top: 0 }); };
  const overview = section === "Overview";

  if (status !== "ready") return <section className="account-gate"><span className="kicker">My Account</span><h1>{status === "loading" ? "Making yourself at home." : status === "signed-out" ? "Your everyday, all together." : "We couldn't load your account."}</h1><p role="status">{status === "loading" ? "Loading your profile, orders and addresses..." : status === "signed-out" ? "Sign in to manage your orders, addresses and wishlist." : "Your account data is unavailable. Please try again."}</p>{status !== "loading" && <button onClick={status === "signed-out" ? onSignIn : onRetry}>{status === "signed-out" ? "Sign in / Create account" : "Try again"} <ArrowRight size={15} /></button>}</section>;

  return <div className={`account-dashboard ${overview ? "account-overview" : ""}`}>
    <aside className="account-sidebar"><span>My Account</span><nav aria-label="Account sections">{navigation.map(({ label, Icon }) => <button key={label} onClick={() => show(label)} aria-current={section === label ? "page" : undefined}><Icon size={17} strokeWidth={1.5} />{label}</button>)}</nav>{!isMockMode && <button className="account-signout" onClick={onLogout}><LogOut size={15} /> Sign out</button>}</aside>
    <div className="account-content">
      <header className="account-intro"><div className="account-greeting"><h1>{overview ? <>Good to see you,<br />{name}.</> : section}</h1><p>{overview ? "Manage your orders, addresses, wishlist and account settings." : "Your FORM/01 account, thoughtfully organized."}</p></div><div className="account-identity"><span className="account-avatar"><UserRound size={29} strokeWidth={1} /></span><div><strong>{name}</strong><span>{profile?.email}</span>{profile?.phone && <span>{profile.phone}</span>}</div><button onClick={onEdit} aria-label="Edit profile"><Pencil size={13} /><span>Edit Profile</span><ArrowRight className="account-mobile-arrow" size={16} /></button></div></header>
      {!overview && <button className="account-back" onClick={() => show("Overview")}>Back to overview</button>}
      {overview && <div className="account-stats">{[{ label: "Orders", count: orders.length, Icon: Package, action: "View Orders" }, { label: "Wishlist", count: wishlistCount, Icon: Heart, action: "View Wishlist" }, { label: "Addresses", count: addresses.length, Icon: MapPin, action: "Manage Addresses" }, { label: "Payment Methods", count: null, Icon: CreditCard, action: "Payment information" }].map(({ label, count, Icon, action }) => <button key={label} onClick={() => show(label)}><span className="account-stat-icon"><Icon size={19} strokeWidth={1.5} /></span><div><span>{label}</span><strong>{count === null ? "At checkout" : count}</strong><small>{action} <ArrowRight size={12} /></small></div><ArrowRight className="account-stat-arrow" size={14} /></button>)}</div>}

      {(overview || section === "Orders") && <><OrderHistory key={section} orders={orders} products={products} onRefresh={onRefreshOrders} onProduct={onProduct} recent={overview} />{overview && <button className="account-text-button" onClick={() => show("Orders")}>View All Orders <ArrowRight size={13} /></button>}</>}

      <div className={overview ? "account-saved-grid" : undefined}>
        {(overview || section === "Addresses") && <section><div className="account-section-heading"><h2>Saved Addresses</h2><button onClick={overview ? () => show("Addresses") : onAddAddress}>{overview ? "View All" : "Add Address"} <ArrowRight size={13} /></button></div><div className="account-addresses">{!addresses.length ? <p className="account-empty">No saved addresses yet.</p> : (overview ? addresses.slice(0, 2) : addresses).map((address) => <article key={address.id}><MapPin size={18} strokeWidth={1.5} /><div><strong>{address.recipient_name}</strong><p>{[address.line1, address.line2, address.city, address.state_or_region, address.postal_code, address.country_code].filter(Boolean).join(", ")}</p>{address.phone && <small>{address.phone}</small>}</div></article>)}</div>{section === "Addresses" && <p className="account-note">Address editing and removal are not available yet. You can add a new delivery address.</p>}</section>}
        {(overview || section === "Payment Methods") && <section><div className="account-section-heading"><h2>Payment Methods</h2>{overview && <button onClick={() => show("Payment Methods")}>Details <ArrowRight size={13} /></button>}</div><div className="account-payment"><CreditCard size={22} strokeWidth={1.5} /><div><strong>Secure payment at checkout</strong><p>Available payment options are provided by Razorpay when you place an order.</p><small>No saved payment methods are available in this account.</small></div></div></section>}
      </div>

      {(overview || section === "Wishlist") && <section className="account-wishlist"><div className="account-section-heading"><h2>Wishlist ({wishlistCount})</h2>{overview && <button onClick={() => show("Wishlist")}>View All <ArrowRight size={13} /></button>}</div>{wishlistCount === 0 ? <p className="account-empty">Save the pieces you love using the heart on any product.</p> : <div className="account-wishlist-grid">{(overview ? savedProducts.slice(0, 6) : savedProducts).map((product) => <article key={product.id}><div className="account-wishlist-photo"><button onClick={() => onProduct(product)} aria-label={`View saved ${product.title}`}><Thumbnail src={product.image_urls?.[0] || product.image_url} alt={product.title} /></button><button className="account-wishlist-heart" onClick={() => onWishlist(product)} aria-label={`Remove ${product.title} from wishlist`}><Heart size={16} fill="currentColor" strokeWidth={1.5} /></button></div><button className="account-wishlist-name" onClick={() => onProduct(product)}>{product.title}</button></article>)}{remoteWishlist.map((item) => <article key={item.id}><div className="account-wishlist-photo"><Thumbnail src={item.image_url} alt={item.title} /></div><Link href={`/shop#product/${encodeURIComponent(item.slug)}`}>{item.title} <ArrowRight size={12} /></Link></article>)}</div>}{wishlistCount > savedProducts.length + remoteWishlist.length && <p className="account-note">Some saved pieces are no longer available in the current catalogue.</p>}</section>}

      {section === "Account Details" && <section><div className="account-section-heading"><h2>Your Details</h2><button onClick={onEdit}>Edit Profile <Pencil size={13} /></button></div><div className="account-payment"><UserRound size={22} /><div><strong>{name}</strong><p>{profile?.email}</p><p>{profile?.phone || "No phone number added."}</p></div></div></section>}
      {section === "Notifications" && <section className="account-payment"><Bell size={22} /><div><h2>Notifications</h2><p>Notification preferences and launch subscriptions are not connected yet. No changes have been made to your subscriptions.</p></div></section>}
      {section === "Support" && <section className="account-payment"><CircleHelp size={22} /><div><h2>Here for your next step.</h2><p>Review your order details for delivery and tracking information. A support contact has not been published yet.</p><button className="account-text-button" onClick={() => show("Orders")}>View your orders <ArrowRight size={13} /></button></div></section>}
      {overview && <nav className="account-mobile-links" aria-label="More account options">{navigation.slice(2).filter((item) => item.label !== "Wishlist").map(({ label, Icon }) => <button key={label} onClick={() => show(label)}><Icon size={17} />{label}<ArrowRight size={14} /></button>)}{!isMockMode && <button onClick={onLogout}><LogOut size={17} />Sign out</button>}</nav>}
    </div>
  </div>;
}
