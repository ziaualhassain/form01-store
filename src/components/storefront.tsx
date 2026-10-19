"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ArrowRight, Check, CircleUserRound, Menu, Package, Search, ShoppingBag, X } from "lucide-react";
import { Address, ApiError, Cart, CartItem, HomepageSection, Order, Product, Profile, Variant, apiErrorMessage, getToken, storeApi } from "@/lib/api";
import DynamicHomepage from "@/components/dynamic-homepage";
import { Grid2X2, Home as HomeIcon } from "lucide-react";
import Link from "next/link";
import ShopCatalogue, { categoryForType } from "@/components/shop-catalogue";
import { isMockMode } from "@/lib/store-config";
import ProductDetail from "@/components/product-detail";
import CollectionsPage from "@/components/collections-page";
import { usePathname } from "next/navigation";
import AccountDashboard from "@/components/account-dashboard";
import { mockAddresses, mockCart, mockOrders, mockProfile, mockProducts } from "@/lib/mock-data";
import CartPage from "@/components/cart-page";
import StoreFooter from "@/components/store-footer";
import PolicyPage from "@/components/policy-page";

type Panel = "cart" | "account" | "address" | "profile" | "confirmation" | "orders" | "earlyAccess" | null;
const money = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-card"><div className="modal-title"><div><span className="kicker">FORM/01</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>; }

export default function Storefront({ shopPage = false, collectionsPage = false, accountPage = false, cartPage = false, policySlug = "" }: { shopPage?: boolean; collectionsPage?: boolean; accountPage?: boolean; cartPage?: boolean; policySlug?: string }) {
  const pathname = usePathname();
  const searchId = useId();
  const menuId = useId();
  const [products, setProducts] = useState<Product[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [cart, setCart] = useState<Cart | null>(isMockMode ? mockCart : null);
  const [cartStatus, setCartStatus] = useState<"loading" | "ready" | "unavailable" | "signed-out">(isMockMode ? "ready" : "loading");
  const [cartVisible, setCartVisible] = useState(cartPage);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [panel, setPanel] = useState<Panel>(cartPage ? "cart" : null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState<"preview" | "live">("preview");
  const [category, setCategory] = useState("All");
  const [catalogueStatus, setCatalogueStatus] = useState<"loading" | "live" | "unavailable">("loading");
  const [homepageStatus, setHomepageStatus] = useState<"loading" | "live" | "unavailable">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [shopVisible, setShopVisible] = useState(shopPage);
  const [collectionsVisible, setCollectionsVisible] = useState(collectionsPage);
  const [collectionId, setCollectionId] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [accountVisible, setAccountVisible] = useState(accountPage);
  const [policyVisible, setPolicyVisible] = useState(Boolean(policySlug));
  const [accountStatus, setAccountStatus] = useState<"loading" | "ready" | "unavailable" | "signed-out">(isMockMode ? "ready" : "loading");
  const [addressFromAccount, setAddressFromAccount] = useState(false);
  const loadPublished = useCallback(async () => {
    setHomepageStatus("loading");
    try { const homepage = await storeApi.home(); setHomepageSections(homepage.sections); setHomepageStatus("live"); }
    catch (error) { console.error("Unable to load published content", error); setHomepageStatus("unavailable"); }
  }, []);

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); }, []);
  const loadCatalogue = useCallback(async () => {
    setCatalogueStatus("loading");
    try { setProducts(await storeApi.allProducts()); setApiMode("live"); setCatalogueStatus("live"); }
    catch (error) { console.error("Unable to load catalogue", error); setCatalogueStatus("unavailable"); notify("Live catalogue unavailable. Please try again."); }
  }, [notify]);
  const loadAccount = useCallback(async () => {
    if (isMockMode) { setAccountStatus("ready"); return; }
    if (!getToken()) { setAccountStatus("signed-out"); return; }
    setAccountStatus("loading");
    try {
      const [nextProfile, nextOrders, nextAddresses] = await Promise.all([storeApi.profile(), storeApi.orders(), storeApi.addresses()]);
      setProfile(nextProfile); setOrders(nextOrders); setAddresses(nextAddresses); setAccountStatus("ready");
    } catch (error) {
      setAccountStatus(error instanceof ApiError && error.status === 401 ? "signed-out" : "unavailable");
      notify(apiErrorMessage(error));
    }
  }, [notify]);
  const loadCart = useCallback(async () => {
    if (isMockMode) { setCartStatus("ready"); return; }
    if (!getToken()) { setCart(null); setCartStatus("signed-out"); return; }
    setCartStatus("loading");
    try { setCart(await storeApi.cart()); setCartStatus("ready"); }
    catch (error) { setCartStatus(error instanceof ApiError && error.status === 401 ? "signed-out" : "unavailable"); notify(apiErrorMessage(error)); }
  }, [notify]);
  const loadLive = useCallback(async () => {
    await Promise.all([
      loadPublished(),
      loadCatalogue(),
    ]);
    await Promise.all([loadAccount(), loadCart()]);
  }, [loadCatalogue, loadAccount, loadCart, loadPublished]);
  const filterByProductType = (productType: string) => { setSelectedProduct(null); setCollectionsVisible(false); setCategory(categoryForType(productType)); setQuery(""); setShopVisible(true); window.location.hash = "shop"; window.scrollTo({ top: 0 }); };
  useEffect(() => {
    const updateView = () => {
      const hash = window.location.hash;
      setPolicyVisible(pathname.startsWith("/policies/") && !["#cart", "#account", "#shop", "#collections"].includes(hash) && !hash.startsWith("#product/") && !hash.startsWith("#collection/"));
      const productHash = hash.startsWith("#product/") ? hash.slice("#product/".length) : null;
      const product = productHash ? products.find((item) => encodeURIComponent(item.slug) === productHash) || homepageSections.flatMap((section) => section.products || []).find((item) => encodeURIComponent(item.slug) === productHash) : undefined;
      if (hash.startsWith("#collection/")) {
        const encodedId = hash.slice("#collection/".length);
        setCollectionId(homepageSections.find((section) => encodeURIComponent(section.id) === encodedId)?.id || "");
      }
      setSelectedProduct(product || null);
      const isCart = hash === "#cart" || (pathname === "/cart" && !hash);
      setCartVisible(isCart);
      setPanel((current) => isCart && (current === null || current === "cart") ? "cart" : !isCart && current === "cart" ? null : current);
      setAccountVisible(!isCart && (hash === "#account" || (pathname === "/account" && !hash.startsWith("#product/") && hash !== "#shop" && !hash.startsWith("#collection/"))));
      setCollectionsVisible(!isCart && (hash === "#collections" || hash.startsWith("#collection/") || (pathname === "/collections" && hash !== "#shop")));
      setShopVisible(!isCart && (pathname === "/shop" || hash === "#shop" || productHash !== null));
    };
    updateView();
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, [pathname, products, homepageSections]);
  useEffect(() => { const timer = window.setTimeout(() => { const saved = localStorage.getItem("form01_store_wishlist"); if (saved) setWishlist(JSON.parse(saved)); void loadLive(); }, 0); return () => window.clearTimeout(timer); }, [loadLive]);
  useEffect(() => {
    if (!isMockMode) return;
    const timer = window.setTimeout(() => {
      const saved = sessionStorage.getItem("form01_demo_cart");
      if (!saved) return;
      try {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Invalid demo cart.");
        const items: CartItem[] = [];
        let total = 0;
        for (const entry of parsed) {
          if (!entry || typeof entry !== "object" || !("variant_id" in entry) || typeof entry.variant_id !== "string" || !("quantity" in entry) || typeof entry.quantity !== "number" || !Number.isInteger(entry.quantity) || entry.quantity < 1) throw new Error("Invalid demo cart item.");
          const variant = mockProducts.flatMap((product) => product.variants).find((variant) => variant.id === entry.variant_id);
          if (!variant || entry.quantity > variant.available || items.some((item) => item.variant_id === variant.id)) throw new Error("Demo cart contains unavailable items.");
          items.push({ id: `mock-cart-${variant.id}`, variant_id: variant.id, quantity: entry.quantity, available_quantity: variant.available });
          total += entry.quantity * variant.price_minor;
        }
        setCart({ id: "mock-cart", currency: "INR", items, subtotal_minor: total, total_minor: total });
      } catch (error) { console.error("Unable to restore demo cart", error); notify("Saved demo cart could not be restored. Showing the sample cart."); sessionStorage.removeItem("form01_demo_cart"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notify]);

  const openProduct = (product: Product) => { setSelectedProduct(product); setShopVisible(true); setPanel(null); window.location.hash = `product/${encodeURIComponent(product.slug)}`; window.scrollTo({ top: 0 }); };
  const openAccount = () => { setSelectedProduct(null); setPanel(null); setAccountVisible(true); setCollectionsVisible(false); setShopVisible(false); window.location.hash = "account"; window.scrollTo({ top: 0 }); void loadAccount(); };
  const openCart = () => { setSelectedProduct(null); setCartVisible(true); setPanel("cart"); window.location.hash = "cart"; window.scrollTo({ top: 0 }); };
  const saveDemoCart = (items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + (mockProducts.flatMap((product) => product.variants).find((variant) => variant.id === item.variant_id)?.price_minor || 0) * item.quantity, 0);
    sessionStorage.setItem("form01_demo_cart", JSON.stringify(items));
    setCart({ id: "mock-cart", currency: "INR", items, subtotal_minor: total, total_minor: total });
  };
  const changeCartQuantity = async (item: CartItem, quantity: number) => {
    if (loading) return;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > Math.min(item.available_quantity, 100)) { notify("Choose a quantity within available stock."); return; }
    if (isMockMode) {
      saveDemoCart((cart?.items || []).flatMap((current) => current.id !== item.id ? [current] : quantity ? [{ ...current, quantity }] : []));
      return;
    }
    setLoading(true);
    try {
      if (quantity === 0) await storeApi.removeCartItem(item.id);
      else await storeApi.addCartItem(item.variant_id, quantity);
      await loadCart();
    } catch (error) { notify(apiErrorMessage(error)); }
    finally { setLoading(false); }
  };
  const backToShop = () => { setSelectedProduct(null); setShopVisible(!collectionsVisible); window.location.hash = collectionsVisible ? collectionId ? `collection/${encodeURIComponent(collectionId)}` : "collections" : "shop"; window.scrollTo({ top: 0 }); };
  const addToCart = async (selectedVariant: Variant, requestedQuantity: number) => {
    const currentQuantity = cart?.items.find((item) => item.variant_id === selectedVariant.id)?.quantity || 0;
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || selectedVariant.status !== "ACTIVE" || requestedQuantity + currentQuantity > Math.min(selectedVariant.available, 100)) { notify("Choose a quantity within the available stock (maximum 100 per item)."); return; }
    if (isMockMode) {
      const items = cart?.items || [];
      const existing = items.find((item) => item.variant_id === selectedVariant.id);
      saveDemoCart(existing ? items.map((item) => item.variant_id === selectedVariant.id ? { ...item, quantity: item.quantity + requestedQuantity } : item) : [...items, { id: `mock-cart-${selectedVariant.id}`, variant_id: selectedVariant.id, quantity: requestedQuantity, available_quantity: selectedVariant.available }]);
      openCart();
      notify("Demo bag updated. No real order will be placed.");
      return;
    }
    setLoading(true);
    try {
      if (!getToken()) { setPanel("account"); notify("Sign in to add items to your cart"); return; }
      await storeApi.addCartItem(selectedVariant.id, currentQuantity + requestedQuantity);
      await loadCart();
      openCart();
    } catch (error) { notify(error instanceof ApiError ? apiErrorMessage(error) : "Could not add to cart"); }
    finally { setLoading(false); }
  };
  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isMockMode) { notify("Accounts are disabled in mock mode. Set MOCK=false to use the live service."); return; }
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const email = String(data.get("email"));
      const password = String(data.get("password"));
      if (authMode === "register") await storeApi.register(email, password);
      const result = await storeApi.login(email, password);
      localStorage.setItem("form01_store_token", result.access_token);
      await Promise.all([loadAccount(), loadCart()]);
      setPanel(window.location.hash === "#cart" || pathname === "/cart" ? "cart" : null); notify("Welcome back to FORM/01");
    } catch (error) { notify(apiErrorMessage(error)); }
    finally { setLoading(false); }
  };
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const updated = await storeApi.updateProfile({ first_name: data.get("first_name"), last_name: data.get("last_name"), display_name: data.get("display_name"), phone: data.get("phone") }); setProfile(updated); setPanel(null); notify("Profile updated"); } catch (error) { notify(apiErrorMessage(error)); } };
  const logout = () => { localStorage.removeItem("form01_store_token"); setProfile(null); setCart(null); setOrders([]); setAddresses([]); setSelectedAddress(null); setPanel(null); setAccountStatus("signed-out"); notify("You have been signed out"); };
  const openOrders = async () => { if (isMockMode) { setPanel("orders"); return; } if (!getToken()) { setPanel("account"); return; } try { setOrders(await storeApi.orders()); setPanel("orders"); } catch (error) { notify(apiErrorMessage(error)); } };
  const toggleWishlist = (product: Product) => { setWishlist((current) => { const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]; localStorage.setItem("form01_store_wishlist", JSON.stringify(next)); return next; }); };
  const saveAddress = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const payload = { recipient_name: data.get("recipient_name"), phone: data.get("phone"), line1: data.get("line1"), city: data.get("city"), state_or_region: data.get("state_or_region"), postal_code: data.get("postal_code"), country_code: data.get("country_code"), is_default_shipping: true }; setLoading(true); try { const address = await storeApi.createAddress(payload); setAddresses((current) => [address, ...current]); setSelectedAddress(address); setPanel(addressFromAccount ? null : "cart"); notify("Delivery address saved"); } catch (error) { notify(apiErrorMessage(error)); } finally { setLoading(false); } };
  const beginCheckout = async () => {
    if (isMockMode) { notify("Checkout is disabled in mock mode. No payment or order will be created."); return; }
    if (!getToken()) { setPanel("account"); notify("Sign in to place your order"); return; }
    if (!selectedAddress) { setAddressFromAccount(false); setPanel("address"); notify("Add a delivery address before checkout"); return; }
    setLoading(true);
    try {
      if (apiMode !== "live") { notify("Connect the middleware API to checkout"); return; }
      if (!cart?.items.length) { notify("Your cart is empty"); return; }
      const checkout = await storeApi.checkout(crypto.randomUUID(), selectedAddress.id);
      if (!checkout.provider_order_id) { notify("Payment setup is not available"); return; }
      const razorpay = (window as Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!razorpay) { notify("Load Razorpay Checkout to continue"); return; }
      const gateway = new razorpay({ key: checkout.provider_key_id, amount: checkout.total_minor, currency: "INR", name: "FORM/01", order_id: checkout.provider_order_id, handler: async (response: Record<string, string>) => {
        await storeApi.verifyPayment(response);
        const confirmed = await storeApi.order(checkout.order_number);
        setConfirmedOrder(confirmed); setOrders((current) => [confirmed, ...current.filter((order) => order.id !== confirmed.id)]);
        setPanel("confirmation"); notify("Order confirmed");
      } });
      gateway.open();
    } catch (error) { notify(apiErrorMessage(error)); }
    finally { setLoading(false); }
  };

  return <main className={`store-shell ${shopVisible ? "shop-view" : ""}`} id="top" onClickCapture={(event) => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!link || link.origin !== window.location.origin) return;
    setPolicyVisible(link.pathname.startsWith("/policies/"));
    setSelectedProduct(null);
    setCartVisible(link.pathname === "/cart" || link.hash === "#cart");
    setPanel((current) => current === "cart" ? null : current);
    setAccountVisible(link.pathname === "/account" || link.hash === "#account");
    setCollectionsVisible(link.pathname === "/collections" || (link.pathname === "/" && link.hash === "#collections"));
    if (link.pathname === "/shop") { setShopVisible(true); setCategory("All"); setQuery(""); }
    else if (link.pathname === "/") setShopVisible(link.hash === "#shop");
    else if (link.pathname === "/collections") setShopVisible(false);
  }}><header className="site-header">
    <Link className="wordmark" href="/" aria-label="FORM/01 home">FORM/01</Link>
    <nav aria-label="Main navigation"><Link href="/shop" aria-current={shopVisible && !collectionsVisible && !accountVisible ? "page" : undefined}>Shop</Link><Link href="/collections" aria-current={collectionsVisible && !accountVisible ? "page" : undefined}>Collections</Link></nav>
    <div className="header-actions">
      <form className={`header-search ${searchOpen ? "is-open" : ""}`} role="search" onSubmit={(event) => { event.preventDefault(); setSelectedProduct(null); setCollectionsVisible(false); setShopVisible(true); setCategory("All"); window.location.hash = "shop"; window.scrollTo({ top: 0 }); }}><Search size={14} /><label className="sr-only" htmlFor={searchId}>Search products</label><input id={searchId} placeholder="Search products, collections..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit" className="sr-only">Search</button></form>
      <button className="icon-button mobile-search-toggle" aria-label="Toggle search" aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></button>
      <button className="icon-button header-account" onClick={openAccount} aria-label="Account"><CircleUserRound size={18} /></button>
      <button className="bag-button" onClick={openCart} aria-label="Cart"><ShoppingBag size={19} /><span>{cart?.items.reduce((total, item) => total + item.quantity, 0) || 0}</span></button>
      <button className="mobile-icon icon-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {menuOpen && <div id={menuId} className="mobile-menu"><Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link><Link href="/collections" onClick={() => setMenuOpen(false)}>Collections</Link><button onClick={() => { setMenuOpen(false); void openOrders(); }}>Your Orders</button></div>}
    </header>
    {isMockMode && <div className="mock-mode-notice" role="status">Mock preview · Sample products and imagery · Checkout disabled</div>}
    {cartVisible && <CartPage cart={cart} products={products} status={cartStatus} catalogueStatus={catalogueStatus} busy={loading} wishlist={wishlist} onWishlist={toggleWishlist} onProduct={openProduct} onQuantity={changeCartQuantity} onCheckout={() => void beginCheckout()} onRetry={() => { void loadCart(); void loadCatalogue(); }} onSignIn={() => { setAuthMode("login"); setPanel("account"); }} />}
    {!cartVisible && policyVisible && <PolicyPage key={policySlug} slug={policySlug} />}
    {!cartVisible && !policyVisible && <>
    {accountVisible ? <AccountDashboard profile={isMockMode ? mockProfile : profile} orders={isMockMode ? mockOrders : orders} addresses={isMockMode ? mockAddresses : addresses} products={products} wishlist={wishlist} status={accountStatus} onRetry={() => void loadAccount()} onSignIn={() => { setAuthMode("login"); setPanel("account"); }} onEdit={() => { if (isMockMode) notify("Profile editing is disabled in mock preview."); else setPanel("profile"); }} onAddAddress={() => { if (isMockMode) notify("Address changes are disabled in mock preview."); else { setAddressFromAccount(true); setPanel("address"); } }} onLogout={logout} onProduct={openProduct} onWishlist={toggleWishlist} /> : selectedProduct ? <ProductDetail key={selectedProduct.id} product={selectedProduct} products={products} cart={cart} wishlist={wishlist} loading={loading} onAdd={addToCart} onWishlist={toggleWishlist} onProduct={openProduct} onBack={backToShop} backLabel={collectionsVisible ? "Collections" : "Shop"} onCategory={filterByProductType} /> : collectionsVisible ? <CollectionsPage sections={homepageSections} products={products} status={homepageStatus} catalogueStatus={catalogueStatus} wishlist={wishlist} onWishlist={toggleWishlist} onProduct={openProduct} onNotify={() => setPanel("earlyAccess")} selectedId={collectionId} onDrop={(id) => { setCollectionId(id); window.location.hash = `collection/${encodeURIComponent(id)}`; }} onRetry={() => void loadLive()} /> : shopVisible ? <ShopCatalogue products={products} status={catalogueStatus} query={query} category={category} onCategory={setCategory} wishlist={wishlist} onWishlist={toggleWishlist} onProduct={openProduct} onRetry={() => void loadCatalogue()} /> : <DynamicHomepage sections={homepageSections} products={products} catalogueStatus={catalogueStatus} wishlist={wishlist} onWishlist={toggleWishlist} onRetry={() => void loadCatalogue()} status={homepageStatus} onProductType={filterByProductType} onProduct={openProduct} onJoin={(email) => { setJoinEmail(email); setAuthMode("register"); setPanel("account"); }} />}
    </>}
    <StoreFooter mobileVisible={accountVisible && !cartVisible && !policyVisible} />
    <nav className="mobile-bottom-nav" aria-label="Quick navigation"><Link href="/" aria-current={!shopVisible && !collectionsVisible && !accountVisible && !cartVisible && !policyVisible ? "page" : undefined}><HomeIcon size={19} /><span>Home</span></Link><Link href="/shop" aria-current={shopVisible && !collectionsVisible && !accountVisible && !cartVisible && !policyVisible ? "page" : undefined}><Search size={19} /><span>Shop</span></Link><Link href="/collections" aria-current={collectionsVisible && !accountVisible && !cartVisible && !policyVisible ? "page" : undefined}><Grid2X2 size={19} /><span>Collections</span></Link><button onClick={openAccount} aria-current={accountVisible && !cartVisible && !policyVisible ? "page" : undefined}><CircleUserRound size={19} /><span>Account</span></button></nav>

    {panel === "earlyAccess" && <Modal title="Be part of the next chapter" onClose={() => setPanel(null)}><div className="account-form"><p>Launch notifications and early-access subscriptions are not connected yet. Creating an account does not subscribe you to alerts or reserve a piece.</p>{isMockMode ? <p>This is a design preview. Account creation and subscriptions are disabled.</p> : <button className="add-button" onClick={() => { setAuthMode("register"); setPanel("account"); }}>Create a store account <ArrowRight size={15} /></button>}<button className="switch-auth" onClick={() => setPanel(null)}>Keep exploring</button></div></Modal>}
    {panel === "profile" && <Modal title="Your FORM/01 profile" onClose={() => setPanel(null)}><form className="account-form" onSubmit={saveProfile}><span className="kicker">Account details</span><input name="display_name" defaultValue={profile?.display_name || ""} placeholder="Display name" /><input name="first_name" defaultValue={profile?.first_name || ""} placeholder="First name" /><input name="last_name" defaultValue={profile?.last_name || ""} placeholder="Last name" /><input name="phone" defaultValue={profile?.phone || ""} placeholder="Phone number" /><span className="kicker">Wishlist / {wishlist.length} saved</span><div className="wishlist-list">{products.filter((product) => wishlist.includes(product.id)).map((product) => <button type="button" key={product.id} onClick={() => openProduct(product)}>{product.title}<ArrowRight size={14} /></button>)}</div><button className="add-button" type="submit">Save profile <Check size={16} /></button><button className="switch-auth" type="button" onClick={logout}>Sign out</button></form></Modal>}
    {panel === "confirmation" && confirmedOrder && <Modal title="Order placed" onClose={() => setPanel(null)}><div className="confirmation-panel"><div className="confirmation-mark"><Check size={24} /></div><span className="kicker">Thank you for choosing FORM/01</span><h3>{confirmedOrder.order_number}</h3><p>Placed {date(confirmedOrder.placed_at)} · Payment {confirmedOrder.payment_status}</p><div className="confirmation-items">{confirmedOrder.items.map((item) => <div key={item.id}><span>{item.product_name_snapshot} / {item.variant_label_snapshot || item.sku_snapshot} × {item.quantity}</span><strong>{money(item.line_total_minor)}</strong></div>)}</div><div className="cart-total"><span>Total</span><strong>{money(confirmedOrder.total_minor)}</strong></div><button className="add-button" onClick={() => setPanel("orders")}>Track this order <Package size={16} /></button></div></Modal>}
    {panel === "address" && <Modal title="Delivery address" onClose={() => setPanel(addressFromAccount ? null : "cart")}><div className="address-panel">{!addressFromAccount && addresses.length > 0 && <div className="saved-addresses"><span className="kicker">Saved addresses</span>{addresses.map((address) => <button type="button" className={selectedAddress?.id === address.id ? "selected-address" : ""} onClick={() => { setSelectedAddress(address); setPanel("cart"); }} key={address.id}><strong>{address.recipient_name}</strong><small>{address.line1}, {address.city} · {address.postal_code}</small></button>)}</div>}<form className="account-form" onSubmit={saveAddress}><span className="kicker">New delivery address</span><input name="recipient_name" placeholder="Full name" required /><input name="phone" placeholder="Phone number" required /><input name="line1" placeholder="Address line" required /><div className="address-grid"><input name="city" placeholder="City" required /><input name="state_or_region" placeholder="State" required /><input name="postal_code" inputMode="numeric" pattern="[1-9][0-9]{5}" placeholder="6-digit PIN code" required /></div><input name="country_code" defaultValue="IN" maxLength={2} placeholder="Country code" required /><button className="add-button" type="submit" disabled={loading}>{loading ? "Saving..." : addressFromAccount ? "Save address" : "Save address and continue"}<ArrowRight size={16} /></button></form></div></Modal>}
    {panel === "account" && <Modal title={authMode === "login" ? "Welcome back" : "Join FORM/01"} onClose={() => setPanel(null)}><form className="account-form" onSubmit={login}><p>{authMode === "login" ? "Sign in to place orders and track delivery." : "Create an account to keep your orders together."}</p><input name="email" type="email" placeholder="Email address" defaultValue={joinEmail} aria-label="Email address" required /><input name="password" type="password" placeholder="Password" minLength={8} aria-label="Password" required /><button className="add-button" type="submit">{loading ? "Connecting..." : authMode === "login" ? "Sign in" : "Create account"}</button><button className="switch-auth" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button></form></Modal>}
    {panel === "orders" && <Modal title="Your orders" onClose={() => setPanel(null)}><div className="orders-panel">{orders.length ? orders.map((order) => <article className="customer-order" key={order.id}><div><span className="kicker">{order.order_number}</span><h3>{money(order.total_minor)}</h3><p>Placed {date(order.placed_at)}</p></div><div className="order-status"><span>{order.payment_status}</span><strong>{order.fulfilment_status}</strong></div>{order.shipments[0] && <div className="tracking-card"><div><span className="kicker">Delivery tracking</span><strong>{order.shipments[0].carrier}</strong><small>{order.shipments[0].status}</small></div><span>{order.shipments[0].tracking_number || "Tracking pending"}</span>{order.shipments[0].tracking_url && <a href={order.shipments[0].tracking_url} target="_blank" rel="noreferrer">Track package <ArrowRight size={14} /></a>}</div>}</article>) : <div className="empty-cart"><Package size={26} /><h3>No orders yet.</h3><p>Your next order will appear here with its delivery status.</p></div>}</div></Modal>}
    {toast && <div className="store-toast">{toast}</div>}
  </main>;
}
