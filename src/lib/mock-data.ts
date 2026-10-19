import type { Address, Cart, HomepageSection, Order, Product, Profile } from "./api";

const photo = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const mountains = photo("photo-1464822759023-fed622ff2c3b", 2000);
const forest = photo("photo-1448375240586-882707db888b");
const trail = photo("photo-1551632811-561732d1e306");
const peaks = photo("photo-1519681393784-d120267933ba");
const colors = [{ name: "Onyx", hex: "#1c1d1a" }, { name: "Sand", hex: "#d9cec1" }, { name: "Olive", hex: "#63654c" }, { name: "Slate", hex: "#616262" }];

const items = [
  { title: "Summit Hoodie", type: "HOODIE", price: 299900, image: photo("photo-1556821840-3a63f95609a7"), badge: "New" },
  { title: "Silence Sweatshirt", type: "SWEATSHIRT", price: 279900, image: "/est_01_drop.png", badge: "Bestseller" },
  { title: "Signature Cap", type: "CAP", price: 99900, image: photo("photo-1588850561407-ed78c282e89b") },
  { title: "Elements Tee", type: "SHIRT", price: 149900, image: photo("photo-1521572163474-6864f9cf17ab") },
  { title: "Trail Hoodie", type: "OVERSIZED-HOODIE", price: 299900, image: photo("photo-1620799140408-edc6dcb6d633") },
  { title: "Ascent Tee", type: "SHIRT", price: 149900, image: photo("photo-1503341504253-dff4815485f1") },
  { title: "Insulated Tumbler", type: "ACCESSORIES", price: 129900, image: photo("photo-1602143407151-7111542de6e8") },
  { title: "Summit Notebook", type: "BOOK", price: 69900, image: photo("photo-1531346878377-a5be20888e57") },
];

export const mockProducts: Product[] = items.map((item, index) => ({
  id: `mock-product-${index + 1}`,
  slug: item.title.toLowerCase().replaceAll(" ", "-"),
  title: item.title,
  description: index === 0 ? "Inspired by the mountains and the quiet pursuit of a higher tomorrow. A heavyweight hoodie made for everyday journeys. Sample product for design preview." : "Minimal design. Functional details. A thoughtful piece for everyday lives.",
  image_url: item.image,
  image_urls: item.image.startsWith("https://") ? [item.image, `${item.image}&fit=crop&h=900&crop=top`, `${item.image}&fit=crop&h=900&crop=bottom`] : [item.image],
  features: ["Considered everyday design", "Signature FORM/01 details"],
  gender: "UNISEX",
  theme: "EST.01",
  product_type: item.type,
  status: "ACTIVE",
  badge: item.badge,
  variants: (["HOODIE", "OVERSIZED-HOODIE", "SWEATSHIRT", "SHIRT"].includes(item.type) ? colors : colors.slice(0, 1)).flatMap((color, colorIndex) => (["HOODIE", "OVERSIZED-HOODIE", "SWEATSHIRT", "SHIRT"].includes(item.type) ? ["XS", "S", "M", "L", "XL", "XXL"] : ["One size"]).map((size, sizeIndex) => ({
    id: `mock-variant-${index + 1}-${colorIndex}-${sizeIndex}`,
    product_id: `mock-product-${index + 1}`,
    sku: `MOCK-${index + 1}-${color.name}-${size}`,
    title: size,
    price_minor: item.price,
    currency: "INR",
    status: "ACTIVE",
    on_hand: 12,
    reserved: 0,
    available: 12,
    color,
  }))),
}));

export const mockProfile: Profile = { id: "demo-profile", email: "zia@example.com", display_name: "Zia", first_name: "Zia", phone: "+91 98765 43210", status: "ACTIVE", roles: [] };
export const mockCart: Cart = {
  id: "mock-cart", currency: "INR",
  items: mockProducts.slice(0, 3).map((product) => ({ id: `mock-cart-${product.variants[0].id}`, variant_id: product.variants[0].id, quantity: 1, available_quantity: product.variants[0].available })),
  subtotal_minor: 679700, total_minor: 679700,
};
export const mockAddresses: Address[] = [
  { id: "demo-home", recipient_name: "Zia / Home", line1: "101, Sample Apartments", city: "Hyderabad", state_or_region: "Telangana", postal_code: "500001", country_code: "IN" },
  { id: "demo-office", recipient_name: "Zia / Office", line1: "Sample Technology Centre", city: "Hyderabad", state_or_region: "Telangana", postal_code: "500032", country_code: "IN" },
];
export const mockOrders: Order[] = [0, 1, 2].map((index) => {
  const product = mockProducts[index];
  const variant = product.variants[0];
  return {
    id: `demo-order-${index}`, order_number: ["F01-2468", "F01-1987", "F01-1765"][index],
    status: index === 1 ? "SHIPPED" : "DELIVERED", payment_status: "PAID", fulfilment_status: "FULFILLED",
    currency: "INR", subtotal_minor: variant.price_minor, total_minor: variant.price_minor,
    discount_minor: 0, shipping_minor: 0, tax_minor: 0,
    contact_email: mockProfile.email, shipping_address: mockAddresses[0],
    placed_at: ["2026-10-12T10:00:00Z", "2026-09-28T10:00:00Z", "2026-09-12T10:00:00Z"][index],
    items: [{ id: `demo-line-${index}`, product_name_snapshot: product.title, variant_label_snapshot: variant.title, sku_snapshot: variant.sku, quantity: 1, line_total_minor: variant.price_minor }],
    payments: [{ id: `demo-payment-${index}`, provider: "Demo payment", status: "CAPTURED", amount_minor: variant.price_minor, currency: "INR" }],
    shipments: [{ id: `demo-shipment-${index}`, carrier: "Demo carrier", status: index === 1 ? "SHIPPED" : "DELIVERED", tracking_number: `DEMO-${index + 1}`, shipped_at: ["2026-10-13T10:00:00Z", "2026-09-29T10:00:00Z", "2026-09-13T10:00:00Z"][index], delivered_at: index === 1 ? null : ["2026-10-16T10:00:00Z", null, "2026-09-16T10:00:00Z"][index] }],
  };
});

export const mockSections: HomepageSection[] = [
  ...[
    { title: "Built beyond\ntrends.", image: mountains, eyebrow: "EST.01" },
    { title: "Less noise.\nMore you.", image: forest, eyebrow: "Silence" },
    { title: "One step\nfurther.", image: trail, eyebrow: "Trail" },
    { title: "A higher\ntomorrow.", image: peaks, eyebrow: "Core" },
  ].map((campaign, index) => ({
    id: `mock-hero-${index}`, type: "hero", position: index,
    content: { eyebrow: campaign.eyebrow, title: campaign.title, subtitle: "Thoughtful essentials for everyday lives.\nInspired by mountains, silence and\na higher tomorrow.", image: { desktop_url: campaign.image, alt: `${campaign.eyebrow} mountain campaign` }, cta: { label: "Shop the Drop", href: "/shop" }, overlay_opacity: .55 },
  })),
  ...[
    { title: "EST.01", date: "Dec 2026", image: mountains, type: "HOODIE" },
    { title: "Silence", date: "Jan 2027", image: forest, type: "SWEATSHIRT" },
    { title: "Trail", date: "Feb 2027", image: trail, type: "HOODIE" },
    { title: "Core", date: "Mar 2027", image: peaks, type: "SHIRT" },
    { title: "Altitude", date: "Apr 2027", image: mountains, type: "HOODIE" },
    { title: "Beyond", date: "May 2027", image: trail, type: "SHIRT" },
  ].map((collection, index) => ({
    id: `mock-collection-${index}`, type: "product_collection", position: index + 4,
    products: index === 0 ? mockProducts.slice(0, 4) : index === 1 ? [mockProducts[1], mockProducts[4]] : index === 2 ? [mockProducts[4], mockProducts[5], mockProducts[6]] : index === 3 ? [mockProducts[2], mockProducts[3], mockProducts[7]] : [],
    content: {
      title: collection.title, description: collection.date, product_type: collection.type, image: { desktop_url: collection.image }, cta: { href: "/collections" },
      campaign: {
        eyebrow: `DROP ${String(index + 1).padStart(2, "0")} · ${collection.date.toUpperCase()}`,
        tab_label: index === 0 ? "DROP 01" : collection.date,
        headline: index === 0 ? "Built beyond trends." : index === 1 ? "Silence is the statement." : index === 2 ? "One step further." : "The everyday, considered.",
        description: `${index === 0 ? "The first drop" : `Discover ${collection.title}`} from FORM/01. A collection inspired by mountains, silence and the pursuit of a higher tomorrow. Designed for everyday lives, and the days you go further.`,
        collection_description: `Essentials with a purpose. Each piece from ${collection.title} is a reminder to move with intention - in the city, on the trail, and within yourself.`,
        launch_at: ["2026-12-31T00:00:00+05:30", "2027-01-31T00:00:00+05:30", "2027-02-28T00:00:00+05:30", "2027-03-31T00:00:00+05:30", "2027-04-30T00:00:00+05:30", "2027-05-31T00:00:00+05:30"][index],
        cta_label: "Join for Early Access",
        location: "27.9881° N\n86.9250° E\nMT EVEREST",
      },
    },
  })),
];
