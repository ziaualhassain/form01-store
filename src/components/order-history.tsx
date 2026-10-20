"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ExternalLink, MapPin, Package, RefreshCw, Search, Truck } from "lucide-react";
import type { Order, OrderAddress, Product } from "@/lib/api";

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
const label = (status: string) => status.toLowerCase().replaceAll("_", " ");
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Date unavailable";
const filters = ["All Orders", "Processing", "Shipped", "Delivered", "Other"] as const;
type Filter = typeof filters[number];
const processing = new Set(["PENDING", "RECEIVED", "CONFIRMED", "PROCESSING", "PACKED"]);
const shipping = new Set(["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"]);
const stages = ["Order placed", "Processing", "Shipped", "In transit", "Delivered"];

function group(order: Order): Filter {
  if (processing.has(order.status)) return "Processing";
  if (shipping.has(order.status)) return "Shipped";
  if (order.status === "DELIVERED") return "Delivered";
  return "Other";
}

function progress(order: Order): number {
  if (order.status === "DELIVERED") return 4;
  if (order.status === "IN_TRANSIT" || order.status === "OUT_FOR_DELIVERY") return 3;
  if (order.status === "SHIPPED") return 2;
  if (["PROCESSING", "PACKED"].includes(order.status)) return 1;
  return 0;
}

function Photo({ product, title }: { product?: Product; title: string }) {
  const src = product?.image_urls?.[0] || product?.image_url;
  const [failed, setFailed] = useState("");
  return <span className="order-item-photo">{src && failed !== src ? <Image src={src} alt={title} fill unoptimized sizes="80px" onError={() => setFailed(src)} /> : <span>F/01</span>}</span>;
}

function DeliveryAddress({ address }: { address?: OrderAddress | null }) {
  if (!address) return <p>Address details are not available for this order.</p>;
  return <address><strong>{address.recipient_name}</strong><span>{address.line1}</span>{address.line2 && <span>{address.line2}</span>}{address.locality && <span>{address.locality}</span>}<span>{[address.city, address.state_or_region, address.postal_code].filter(Boolean).join(", ")}</span><span>{address.country_code}</span>{address.phone && <span>{address.phone}</span>}{address.delivery_instructions && <p>Delivery instructions: {address.delivery_instructions}</p>}</address>;
}

export default function OrderHistory({ orders, products, onRefresh, onProduct, recent = false }: {
  orders: Order[];
  products: Product[];
  onRefresh: () => void;
  onProduct?: (product: Product) => void;
  recent?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("All Orders");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const id = useId();
  const filtered = orders.filter((order) => (filter === "All Orders" || group(order) === filter) && `${order.order_number} ${order.items.map((item) => item.product_name_snapshot).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = recent ? orders.slice(0, 3) : filtered;
  const toggle = (orderId: string) => setExpanded((current) => current.includes(orderId) ? current.filter((item) => item !== orderId) : [...current, orderId]);

  return <section className="order-history" aria-label={recent ? "Recent orders" : "Your orders"}>
    <div className="order-history-heading"><div><h2>{recent ? "Recent Orders" : "Your Orders"}</h2><p>{recent ? "The latest on your everyday essentials." : "Track, manage and view all your orders in one place."}</p></div><button className="order-secondary" onClick={onRefresh}><RefreshCw size={14} />Refresh orders</button></div>
    {!recent && orders.length > 0 && <>
      <div className="order-filters" role="group" aria-label="Filter orders">{filters.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item} <span>({item === "All Orders" ? orders.length : orders.filter((order) => group(order) === item).length})</span></button>)}</div>
      <label className="order-search"><Search size={16} /><span className="sr-only">Search your orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by order number or product" type="search" /></label>
    </>}
    {!visible.length && <div className="order-empty"><Package size={30} /><h3>{orders.length ? "No matching orders." : "Your next chapter is waiting."}</h3><p>{orders.length ? "Try another status or search term." : "Once you place an order, its progress and details will appear here."}</p>{orders.length ? <button className="order-secondary" onClick={() => { setFilter("All Orders"); setQuery(""); }}>Clear filters</button> : <Link className="order-primary" href="/shop">Explore the shop <ArrowRight size={14} /></Link>}</div>}
    <div className="order-cards">{visible.map((order) => {
      const open = expanded.includes(order.id);
      const detailId = `${id}-${order.id}`;
      const current = progress(order);
      const trackable = order.shipments.filter((shipment) => shipment.tracking_url && /^https?:\/\//i.test(shipment.tracking_url));
      const completed = ["DELIVERED", "FULFILLED"].includes(order.status);
      const stopped = ["CANCELLED", "PAYMENT_FAILED"].includes(order.status);
      const deliveredAt = order.status === "DELIVERED" ? order.shipments.find((shipment) => shipment.delivered_at)?.delivered_at : null;
      return <article className={`order-card ${stopped ? "order-stopped" : ""}`} key={order.id}>
        <header className="order-card-heading"><div><h3>Order {order.order_number.startsWith("#") ? order.order_number : `#${order.order_number}`}</h3><p>{order.placed_at ? `Placed on ${date(order.placed_at)}` : "Order date unavailable"}</p></div><div className="order-current"><span className={`account-order-status ${completed ? "delivered" : stopped ? "stopped" : ""}`}>{label(order.status)}</span><small>{deliveredAt ? `Delivered on ${date(deliveredAt)}` : order.status === "FULFILLED" ? "Fulfilment complete. Delivery is not yet confirmed." : stopped ? "See order details for payment information." : "Updates appear here as your order progresses."}</small></div></header>
        {!completed && !stopped && <ol className="order-progress" aria-label="Order progress">{stages.map((stage, index) => <li key={stage} className={index <= current ? "reached" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Check size={13} /> : index === 2 || index === 3 ? <Truck size={13} /> : <Package size={13} />}</span><strong>{stage}</strong>{index === 0 && order.placed_at && <small>{date(order.placed_at)}</small>}</li>)}</ol>}
        <div className="order-card-items">{order.items.map((item) => {
          const product = products.find((product) => item.product_slug_snapshot ? product.slug === item.product_slug_snapshot : product.title === item.product_name_snapshot);
          return <div className="order-card-item" key={item.id}><Photo product={product} title={item.product_name_snapshot} /><div>{product && onProduct ? <button className="order-product-link" onClick={() => onProduct(product)}>{item.product_name_snapshot}<ArrowRight size={13} /></button> : <strong>{item.product_name_snapshot}</strong>}<p>{item.variant_label_snapshot || item.sku_snapshot} <span aria-hidden="true">/</span> Qty {item.quantity}</p><small>SKU: {item.sku_snapshot}</small></div><strong>{money(item.line_total_minor, order.currency)}</strong></div>;
        })}{!order.items.length && <p className="order-muted">Item details are not available for this order.</p>}</div>
        <footer className="order-card-actions"><div><span>Order total</span><strong>{money(order.total_minor, order.currency)}</strong><small>Payment: {label(order.payment_status)}</small></div><div>{trackable.length === 1 && <a className="order-primary" href={trackable[0].tracking_url ?? undefined} target="_blank" rel="noreferrer">Track order <ExternalLink size={14} /></a>}<button className={trackable.length ? "order-secondary" : "order-primary"} aria-expanded={open} aria-controls={detailId} onClick={() => toggle(order.id)}>{open ? "Hide details" : "Order details"}<ChevronDown size={14} /></button></div></footer>
        {open && <div className="order-expanded" id={detailId}>
          <div className="order-detail-grid"><section><h4><MapPin size={16} />Delivery address</h4><DeliveryAddress address={order.shipping_address} />{order.contact_email && <p className="order-contact">Order contact: {order.contact_email}</p>}</section><section><h4>Payment &amp; order summary</h4><dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal_minor, order.currency)}</dd></div>{order.discount_minor !== undefined && <div><dt>Discount</dt><dd>{order.discount_minor > 0 ? "-" : ""}{money(order.discount_minor, order.currency)}</dd></div>}<div><dt>Shipping</dt><dd>{order.shipping_minor === undefined ? "Not provided" : money(order.shipping_minor, order.currency)}</dd></div><div><dt>Tax</dt><dd>{order.tax_minor === undefined ? "Not provided" : money(order.tax_minor, order.currency)}</dd></div><div className="order-total"><dt>Total</dt><dd>{money(order.total_minor, order.currency)}</dd></div></dl><p>Payment status: <strong>{label(order.payment_status)}</strong></p>{order.payments.map((payment) => <p key={payment.id}>{payment.provider} / {label(payment.status)} / {money(payment.amount_minor, payment.currency)}</p>)}</section></div>
          <section className="order-delivery"><h4><Truck size={16} />Shipment updates</h4>{order.shipments.length ? order.shipments.map((shipment) => <div className="order-shipment" key={shipment.id}><div><strong>{shipment.carrier}</strong><span>{label(shipment.status)}</span><p>{shipment.tracking_number ? `Tracking number: ${shipment.tracking_number}` : "Tracking number has not been assigned."}</p>{shipment.shipped_at && <p>Shipped on {date(shipment.shipped_at)}</p>}{shipment.delivered_at && <p>Delivered on {date(shipment.delivered_at)}</p>}</div>{shipment.tracking_url && /^https?:\/\//i.test(shipment.tracking_url) && <a className="order-secondary" href={shipment.tracking_url} target="_blank" rel="noreferrer">Track package <ExternalLink size={14} /></a>}</div>) : <p>No shipment details have been published yet. Tracking will appear when provided by the store.</p>}</section>
          <div className="order-help"><div><strong>Need a hand with this order?</strong><p>Include your order number when contacting us.</p></div><a className="order-secondary" href={`mailto:support@form01.com?subject=${encodeURIComponent(`Help with order ${order.order_number}`)}`}>Contact support <ArrowRight size={14} /></a><Link href="/policies/returns-and-refunds">Returns policy</Link></div>
        </div>}
      </article>;
    })}</div>
  </section>;
}
