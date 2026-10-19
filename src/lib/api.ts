import { apiBaseUrl, isMockMode } from "./store-config";
import { mockProducts, mockSections } from "./mock-data";
import type { PolicyDocument } from "./policies";

export type Variant = { id: string; product_id: string; sku: string; title?: string | null; price_minor: number; currency: string; status: string; on_hand: number; reserved: number; available: number; color?: { name: string; hex: string } };
export type Product = { id: string; title: string; slug: string; description?: string | null; image_url?: string | null; image_urls: string[]; features: string[]; gender?: string | null; theme?: string | null; product_type?: string | null; status: string; variants: Variant[]; badge?: string };
export type CartItem = { id: string; variant_id: string; quantity: number; available_quantity: number };
export type Cart = { id: string; currency: string; items: CartItem[]; subtotal_minor: number; total_minor: number };
export type CheckoutQuote = { currency: string; subtotal_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; total_minor: number };
export type Address = { id: string; recipient_name: string; phone?: string | null; line1: string; line2?: string | null; city: string; state_or_region?: string | null; postal_code: string; country_code: string };
export type Profile = { id: string; email: string; status: string; roles: string[]; first_name?: string | null; last_name?: string | null; display_name?: string | null; phone?: string | null; addresses?: Address[]; orders?: Array<{ id: string; order_number: string; status: string; payment_status: string; fulfilment_status: string; total_minor: number; placed_at?: string | null }>; wishlist?: Array<{ id: string; product_id: string; title: string; slug: string; image_url?: string | null }> };
export type Order = { id: string; order_number: string; status: string; payment_status: string; fulfilment_status: string; currency: string; subtotal_minor: number; total_minor: number; placed_at?: string | null; items: Array<{ id: string; product_name_snapshot: string; variant_label_snapshot?: string | null; sku_snapshot: string; quantity: number; line_total_minor: number }>; payments: Array<{ id: string; provider: string; status: string; amount_minor: number; currency: string }>; shipments: Array<{ id: string; carrier: string; tracking_number?: string | null; tracking_url?: string | null; status: string }> };
export type HomepageSection = { id: string; type: string; position: number; content: Record<string, unknown>; products?: Product[] };

const baseUrl = apiBaseUrl;
export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export const apiErrorMessage = (error: unknown) => { if (!(error instanceof ApiError)) return "The request failed"; try { const payload = JSON.parse(error.message) as { detail?: string; error?: { message?: string } }; return payload.detail || payload.error?.message || error.message; } catch { return error.message; } };
export const getToken = () => isMockMode || typeof window === "undefined" ? null : localStorage.getItem("form01_store_token");
export const clearToken = () => typeof window !== "undefined" && localStorage.removeItem("form01_store_token");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isMockMode) throw new ApiError(503, "This action is unavailable in mock mode. Set MOCK=false and restart to use live accounts and checkout.");
  const token = getToken();
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const storeApi = {
  policy: (slug: string) => request<PolicyDocument>(`/policies/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }),
  allProducts: async (): Promise<Product[]> => {
    if (isMockMode) return mockProducts;
    const products: Product[] = [];
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const page = await request<Product[]>(`/products?limit=${limit}&offset=${offset}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      products.push(...page);
      if (page.length < limit) return products;
    }
  },
  products: (params?: { gender?: string; theme?: string; product_type?: string }) => {
    if (isMockMode) return Promise.resolve(mockProducts.filter((product) => Object.entries(params || {}).every(([key, value]) => !value || product[key as "gender" | "theme" | "product_type"] === value)));
    const query = new URLSearchParams(Object.entries(params || {}).filter((entry) => entry[1]));
    return request<Product[]>(`/products${query.toString() ? `?${query}` : ""}`);
  },
  home: async () => {
    if (isMockMode) return { schema_version: 1, page: "home", brand: { name: "FORM/01" }, sections: mockSections };
    const homepage = await request<{ schema_version: number; page: string; brand: Record<string, unknown>; sections: Array<Omit<HomepageSection, "products"> & { products?: Array<Omit<Product, "status"> & { status?: string }> }> }>("/storefront/home", { cache: "no-store", signal: AbortSignal.timeout(10000) });
    // The homepage service only selects active products and omits their status.
    return { ...homepage, sections: homepage.sections.map((section): HomepageSection => ({ ...section, products: section.products?.map((product) => ({ ...product, status: product.status ?? "ACTIVE" })) })) };
  },
  login: (email: string, password: string) => request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) => request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  cart: () => request<Cart>("/cart"),
  addCartItem: (variant_id: string, quantity: number) => request<CartItem>("/cart/items", { method: "POST", body: JSON.stringify({ variant_id, quantity }) }),
  removeCartItem: (itemId: string) => request<void>(`/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
  quote: () => request<CheckoutQuote>("/checkout/quote", { method: "POST", body: JSON.stringify({}) }),
  addresses: () => request<Address[]>("/me/addresses"),
  createAddress: (payload: Record<string, unknown>) => request<Address>("/me/addresses", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => request<Profile>("/me/profile"),
  updateProfile: (payload: Record<string, unknown>) => request<Profile>("/me/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  checkout: (idempotency_key: string, shipping_address_id: string) => request<{ order_number: string; total_minor: number; provider_order_id?: string; provider_key_id?: string }>("/checkout", { method: "POST", body: JSON.stringify({ payment_provider: "razorpay", idempotency_key, shipping_address_id }) }),
  verifyPayment: (payload: Record<string, string>) => request("/payments/razorpay/verify", { method: "POST", body: JSON.stringify(payload) }),
  orders: () => request<Order[]>("/me/orders"),
  order: (number: string) => request<Order>(`/me/orders/${number}`),
};
