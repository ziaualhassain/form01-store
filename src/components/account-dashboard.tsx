"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, CircleHelp, CreditCard, Heart, Home, LogOut, MapPin, Package, Pencil, UserRound } from "lucide-react";
import type { Address, Order, Product, Profile } from "@/lib/api";
import { isMockMode } from "@/lib/store-config";

const navigation = [
  { label: "Overview", Icon: Home }, { label: "Orders", Icon: Package },
  { label: "Addresses", Icon: MapPin }, { label: "Wishlist", Icon: Heart },
  { label: "Payment Methods", Icon: CreditCard }, { label: "Account Details", Icon: UserRound },
  { label: "Notifications", Icon: Bell }, { label: "Support", Icon: CircleHelp },
];
const money = (amount: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Date unavailable";

function Thumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? <Image src={src} alt={alt} fill unoptimized sizes="100px" onError={() => setFailed(src)} /> : <span className="account-photo-placeholder">F/01</span>;
}

export default function AccountDashboard({ profile, orders, addresses, products, wishlist, status, onRetry, onSignIn, onEdit, onAddAddress, onLogout, onProduct, onWishlist }: {
  profile: Profile | null;
  orders: Order[];
  addresses: Address[];
  products: Product[];
  wishlist: string[];
  status: "loading" | "ready" | "unavailable" | "signed-out";
  onRetry: () => void;
  onSignIn: () => void;
  onEdit: () => void;
  onAddAddress: () => void;
  onLogout: () => void;
  onProduct: (product: Product) => void;
  onWishlist: (product: Product) => void;
}) {
  const [section, setSection] = useState("Overview");
  const [expandedOrder, setExpandedOrder] = useState("");
  const orderDetailsId = useId();
  const savedProducts = products.filter((product) => wishlist.includes(product.id));
  const remoteWishlist = (profile?.wishlist || []).filter((item) => !savedProducts.some((product) => product.id === item.product_id));
  const wishlistCount = new Set([...wishlist, ...(profile?.wishlist || []).map((item) => item.product_id)]).size;
  const name = profile?.display_name || profile?.first_name || "there";
  const show = (label: string) => { setSection(label); setExpandedOrder(""); window.scrollTo({ top: 0 }); };
  const overview = section === "Overview";

  if (status !== "ready") return <section className="account-gate"><span className="kicker">My Account</span><h1>{status === "loading" ? "Making yourself at home." : status === "signed-out" ? "Your everyday, all together." : "We couldn't load your account."}</h1><p role="status">{status === "loading" ? "Loading your profile, orders and addresses..." : status === "signed-out" ? "Sign in to manage your orders, addresses and wishlist." : "Your account data is unavailable. Please try again."}</p>{status !== "loading" && <button onClick={status === "signed-out" ? onSignIn : onRetry}>{status === "signed-out" ? "Sign in / Create account" : "Try again"} <ArrowRight size={15} /></button>}</section>;

  return <div className={`account-dashboard ${overview ? "account-overview" : ""}`}>
    <aside className="account-sidebar"><span>My Account</span><nav aria-label="Account sections">{navigation.map(({ label, Icon }) => <button key={label} onClick={() => show(label)} aria-current={section === label ? "page" : undefined}><Icon size={17} strokeWidth={1.5} />{label}</button>)}</nav>{!isMockMode && <button className="account-signout" onClick={onLogout}><LogOut size={15} /> Sign out</button>}</aside>
    <div className="account-content">
      <header className="account-intro"><div className="account-greeting"><h1>{overview ? <>Good to see you,<br />{name}.</> : section}</h1><p>{overview ? "Manage your orders, addresses, wishlist and account settings." : "Your FORM/01 account, thoughtfully organized."}</p></div><div className="account-identity"><span className="account-avatar"><UserRound size={29} strokeWidth={1} /></span><div><strong>{name}</strong><span>{profile?.email}</span>{profile?.phone && <span>{profile.phone}</span>}</div><button onClick={onEdit} aria-label="Edit profile"><Pencil size={13} /><span>Edit Profile</span><ArrowRight className="account-mobile-arrow" size={16} /></button></div></header>
      {!overview && <button className="account-back" onClick={() => show("Overview")}>Back to overview</button>}
      {overview && <div className="account-stats">{[{ label: "Orders", count: orders.length, Icon: Package, action: "View Orders" }, { label: "Wishlist", count: wishlistCount, Icon: Heart, action: "View Wishlist" }, { label: "Addresses", count: addresses.length, Icon: MapPin, action: "Manage Addresses" }, { label: "Payment Methods", count: null, Icon: CreditCard, action: "Payment information" }].map(({ label, count, Icon, action }) => <button key={label} onClick={() => show(label)}><span className="account-stat-icon"><Icon size={19} strokeWidth={1.5} /></span><div><span>{label}</span><strong>{count === null ? "At checkout" : count}</strong><small>{action} <ArrowRight size={12} /></small></div><ArrowRight className="account-stat-arrow" size={14} /></button>)}</div>}

      {(overview || section === "Orders") && <section className="account-orders"><div className="account-section-heading"><h2>{overview ? "Recent Orders" : "Your Orders"}</h2>{overview && <button onClick={() => show("Orders")}>View All Orders <ArrowRight size={13} /></button>}</div>{!orders.length ? <p className="account-empty">No orders yet. Your next chapter starts in the <Link href="/shop">shop</Link>.</p> : (overview ? orders.slice(0, 3) : orders).map((order) => {
        const first = order.items[0];
        const product = products.find((product) => product.title === first?.product_name_snapshot);
        const status = order.shipments[0]?.status || order.fulfilment_status;
        const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return <article className="account-order" key={order.id}><div className="account-order-row"><span className="account-order-photo"><Thumbnail src={product?.image_urls?.[0] || product?.image_url} alt={first?.product_name_snapshot || "Order"} /></span><strong>{order.order_number.startsWith("#") ? order.order_number : `#${order.order_number}`}</strong><div className="account-order-description"><span>{date(order.placed_at)}</span><small>{quantity} {quantity === 1 ? "item" : "items"} · {order.items.map((item) => item.product_name_snapshot).join(", ")}</small></div><span className={`account-order-status ${status.toUpperCase() === "DELIVERED" ? "delivered" : ""}`}>{status.toLowerCase().replaceAll("_", " ")}</span><button onClick={() => setExpandedOrder(expandedOrder === order.id ? "" : order.id)} aria-expanded={expandedOrder === order.id} aria-controls={`${orderDetailsId}-${order.id}`} aria-label={`View details for ${order.order_number}`}><span>View Details <ArrowRight size={12} /></span><span className="account-order-arrow"><ArrowRight size={16} /></span></button></div>{expandedOrder === order.id && <div className="account-order-details" id={`${orderDetailsId}-${order.id}`}>{order.items.map((item) => <div key={item.id}><span>{item.product_name_snapshot} / {item.variant_label_snapshot || item.sku_snapshot} × {item.quantity}</span><strong>{money(item.line_total_minor, order.currency)}</strong></div>)}<p>Total: {money(order.total_minor, order.currency)} · Payment: {order.payment_status}</p>{order.shipments.map((shipment) => <p key={shipment.id}>{shipment.carrier} · {shipment.tracking_number || "Tracking pending"}{shipment.tracking_url && /^https?:\/\//.test(shipment.tracking_url) && <a href={shipment.tracking_url} target="_blank" rel="noreferrer"> Track package <ArrowRight size={12} /></a>}</p>)}</div>}</article>;
      })}</section>}

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
