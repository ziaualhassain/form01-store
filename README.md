This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Mock and live modes

The storefront runs on **http://localhost:3001** (`npm run dev` or `npm start`).
The live middleware API is **http://localhost:8000/api/v1**.

Set these non-secret settings in your local environment:

```dotenv
MOCK=true
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- `MOCK=true` (the default): sample homepage campaigns, collections,
  and eight dummy shop products. Filtering, sorting, wishlist, product
  options, and an in-memory demo bag work without the middleware. Accounts,
  checkout, and payments are explicitly disabled. No middleware requests or
  Razorpay script are loaded, and existing live login tokens are ignored.
- `MOCK=false`: homepage, products, account, cart, and checkout use the middleware.
  API failures show errors rather than silently displaying mock catalogue data.
- Only the exact strings `true` and `false` are accepted. `MOCK` takes precedence
  over the optional `NEXT_PUBLIC_MOCK` alias.
- Restart the development server after changing settings. Production mode is
  compiled into the client bundle: rebuild with the desired environment before
  `npm start`. No secrets should use a `NEXT_PUBLIC_` variable.

Without editing an environment file, you can also run:

```bash
MOCK=true npm run dev
# Or connect to the real middleware:
MOCK=false NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
```

If the site still shows "Mock preview" after setting `MOCK=false`, stop the
existing development server (Ctrl+C in its terminal), then run `npm run dev`
again from this project's directory and reload `http://localhost:3001`.
The flag is resolved in `next.config.ts`; do not rely on hot reload to switch
modes. For production, rebuild with `MOCK=false npm run build` before starting
the server; changing the flag only when running `npm start` does not change an
existing mock build.

Mock photography uses sample CDN images plus the bundled EST.01 artwork, not
the exact product renders in the reference screenshot. Replace the sample
assets in `src/lib/mock-data.ts` or publish your real artwork in live mode.

## Homepage content

### Categories and CDN artwork

Homepage category tiles and shop filter tabs derive from ACTIVE products'
`product_type` values. Categories with no published products disappear; sold-out
published products keep their category visible. Stock-only filtering remains
optional. Known type aliases (for example SHIRT and OVERSIZED_SHIRT) share a
category; new types appear automatically. No category list or sample category
photography is hardcoded into the homepage.

In Admin > Homepage, append a `category_grid` section to the existing JSON array:

```json
{
  "section_key": "shop-categories",
  "section_type": "category_grid",
  "position": 1,
  "enabled": true,
  "content": {
    "items": [
      {
        "product_type": "SHIRT",
        "image": {
          "desktop_url": "https://your-cdn.example/categories/shirts.webp",
          "mobile_url": "https://your-cdn.example/categories/shirts-mobile.webp",
          "alt": "Everyday shirts"
        }
      }
    ]
  }
}
```

Use real CDN URLs, not the example URLs. Existing publishing/scheduling controls
apply. The middleware stores this in the same homepage database table and returns
it through `/storefront/home`; no migration is needed. Without a category image,
the storefront uses an available product image, then a neutral branded tile.
Configuration never creates empty categories. Keep all other sections when
saving: the Homepage endpoint replaces the entire array.

Below Popular Choices, the homepage includes the shop catalogue with category,
price, gender, stock, and sorting controls. It progressively renders 12 products
at a time as the visitor approaches the bottom, with a Load more button as a
keyboard/browser fallback. Filtering and sorting restart the visible batch.
It uses the existing fully fetched live catalogue (not additional API requests
per scroll), stops after all matching active products, and never repeats items
to simulate an endless inventory. Product details and wishlist use the same
handlers as the dedicated Shop page, whose rendering remains unchanged.

Both shop surfaces share a warm ivory filter panel, compact category tabs,
consistent sort/filter controls, and removable active-filter chips. Selections
apply immediately; View products closes the panel, while Reset all clears
category, gender, price and stock filters. Escape or Close filters returns focus
to the filter toggle. On mobile, price controls form a two-column row and the
remaining fields stack, with visible keyboard focus and inline price errors.

### Brand typography

The storefront follows the typography verified on `https://www.form01.com`:
Arial, Helvetica, sans-serif, with bold (700), tightly tracked display headings,
regular body copy, and uppercase navigation/eyebrows with expanded tracking.
The shared family is `--font-brand` in `src/app/globals.css`; display rules use
it throughout the homepage, shop, products, collections, account, cart, and
policies. Responsive font sizes remain tailored to the store's layouts.
No external font download or custom webfont is required.

The responsive homepage uses the public middleware endpoint
`GET /api/v1/storefront/home`. Set `NEXT_PUBLIC_API_URL` to the middleware API
base URL (defaults to `http://localhost:8000/api/v1`).

Publish homepage sections through the existing admin Homepage editor. A hero
section's `content` uses this shape:

```json
{
  "eyebrow": "EST.01",
  "title": "Built beyond\ntrends.",
  "subtitle": "Thoughtful essentials for everyday lives.\nInspired by a higher tomorrow.",
  "image": {
    "desktop_url": "https://your-cdn.example.com/home/hero-desktop.jpg",
    "mobile_url": "https://your-cdn.example.com/home/hero-mobile.jpg",
    "alt": "FORM/01 campaign in the mountains"
  },
  "overlay_opacity": 0.55,
  "cta": { "label": "Shop the Drop", "href": "/#shop" }
}
```

The admin save payload still uses `section_type: "hero"` and the public response
uses `type: "hero"`. For admin CTA validation, use an internal path such as `"/#shop"`
instead of `"#shop"`. Images use HTTPS CDN URLs or local asset paths. A mobile
image is optional and falls back to the desktop image. CDN assets are served
directly, so publishing from a new CDN does not require a Next image allowlist
change. Images need a suitable mobile crop and readable negative space for copy.
The reference mockup's campaign artwork is not bundled; publish your actual
campaign image to replace the preview mountain photograph.

Multiple published heroes become manually navigable slides in position order.
The hero is followed by Shop by Category, then Popular Choices. The Featured
Collection rail is no longer displayed on the homepage; collections remain
available through the main navigation. Popular Choices shows up to four unique
active products, prioritizing admin-published `product_collection` selections
in section order, then filling remaining spaces from the catalogue. This is a
curated selection, not a sales-based popularity ranking. Product cards reuse
the shop's wishlist, gallery selectors, pricing, and product-options flow.
`editorial` sections are not displayed while Journal is removed.
`statement` and `announcement` sections remain supported. Section
images and copy come from the public payload. Category cards use matching
published collection imagery when available and filter the existing catalogue.

Live API failures are displayed explicitly. Demo campaigns and collections
are only enabled in mock mode. Publishing changes appears on
the next page load.

Shop links open `/shop`; `/products` redirects to `/shop` for existing admin
hero CTAs. Existing `/#shop` campaign links and homepage category
tiles also open the full shop view, preserving product details, cart,
account, orders, and checkout. The Join the Journey signup section has been
removed from the homepage. Account registration remains available through
the account sign-in flow.

## Collections

`/collections` is the dedicated collection/drop experience. Header, mobile
navigation, and homepage collection cards open it. Drop tabs change the hero,
story, countdown, and curated products. Links such as
`/collections#collection/<encoded-section-id>` select a specific published drop.
Wishlist, image selectors, product options, and the bag reuse the shop flows.
The lookbook expands a gallery of the selected collection's published products.

Live data uses existing published `product_collection` sections from
`GET /api/v1/storefront/home`, in position order, including their resolved
`products`. No new collection API is required. Add optional campaign fields to
the section's `content` in the admin JSON editor:

```json
{
  "title": "EST.01",
  "description": "Essentials with a purpose.",
  "theme": "EST.01",
  "product_limit": 4,
  "image": {
    "desktop_url": "https://your-cdn.example.com/est01/desktop.jpg",
    "mobile_url": "https://your-cdn.example.com/est01/mobile.jpg",
    "alt": "EST.01 mountain campaign"
  },
  "cta": { "label": "Explore the collection", "href": "/collections" },
  "campaign": {
    "eyebrow": "DROP 01 · DEC 2026",
    "tab_label": "DROP 01",
    "headline": "Built beyond trends.",
    "description": "The story behind this collection.",
    "collection_description": "Move with intention, wherever the day takes you.",
    "launch_at": "2026-12-31T00:00:00+05:30",
    "cta_label": "Join for Early Access",
    "location": "27.9881° N / 86.9250° E / MT EVEREST"
  }
}
```

The image may alternatively be overridden in `campaign.image`. Launch times
should include a timezone; the countdown uses the visitor's current time,
updates every second, and changes to "The drop is here" at zero. Missing dates
hide the countdown; invalid dates display "Launch date to be announced."
Neither dates nor campaign imagery are fabricated in live mode. Upcoming
collections can publish an empty product selection, displaying an empty state.
Publishing schedules still control whether a section is publicly visible.

The early-access button explains that subscriptions are not connected. In live
mode it optionally leads to existing account registration, explicitly not a
notification subscription or reservation. Mock mode never creates an account.
No conservation/donation claims are made without supporting backend content.

## Journal and Our Story

Journal and Our Story are removed for now, including their routes, homepage
stories, navigation entries, and account/cart promotions. `/journal` and
`/our-story` return 404; legacy homepage hashes no longer open editorial views.
Existing admin-published editorial data is left unchanged for future use.

## Footer and policies

The footer uses a full-width warm neutral surface, compact brand typography,
and a three-column desktop layout rather than an inset rounded card. It appears
across desktop storefront pages. On mobile
(640px and below), it appears beneath My Account/Profile only, including the
signed-out account prompt. It links to six `/policies/<slug>` pages, with
Contact us and Grievance redressal sharing `contact-and-grievance`.

Live policy pages use the public middleware `GET /api/v1/policies/{slug}`.
The policy pack is not approved yet: a 409 response displays a clear unpublished
notice and the support email, never draft placeholders. Errors have a retry
action. Mock mode shows the same unpublished state without middleware requests
or fabricated legal text. The middleware also exposes `GET /api/v1/policies`
for the policy index/publication status. See its README for the approval process.
Policy pages remain excluded from search indexing while content is unfinished.

## Shopping cart

`/cart` and the header bag open the full-page responsive cart. Product additions
also open the cart via `#cart`, retaining the shared commerce state.

- Desktop has product/price/quantity/line-total rows, an order-summary sidebar,
  recommendations and shipping/returns disclosures. Mobile
  stacks compact product rows, discount entry and the summary.
- Quantity controls respect available stock and the API's 100-unit limit.
  Live updates send absolute quantities to `POST /cart/items`; removal uses
  `DELETE /cart/items/{item_id}` (requires the accompanying middleware update).
  Failed mutations display errors and do not silently remove products.
- Choose or create a delivery address before calculating live totals. The
  middleware requires `shipping_address_id` in `POST /checkout/quote`.
  Live totals, shipping, discounts and tax come from that quote.
  Changing the address or cart invalidates the previous quote. Checkout is
  disabled until the latest quote succeeds; failures offer retry.
  No shipping threshold or returns window is fabricated from the reference.
- Product names, images, variant labels and prices resolve from the catalogue.
  Missing details are identified explicitly. Recommendations exclude products
  already in the cart and reuse the existing wishlist/product-options controls.
- Discount entry explains that coupon application is not supported yet;
  it never reports a successful discount or changes totals.
- Mock starts with three labeled sample pieces (₹6,797), and persists changes
  in session storage across navigation/reload. An empty mock cart stays empty.
  Existing live tokens are ignored and real checkout remains disabled.
- Live signed-out, loading, unavailable/retry and empty states are explicit.
- Checkout checks that Razorpay has loaded before creating an order. Unchanged
  checkout attempts reuse an idempotency key for the current page lifetime;
  this does not provide recovery across reloads. Payment-confirmation failures
  show the order number and direct customers to orders/support before retrying.
  The cart is refreshed after payment verification.

## My Account

`/account` and the header/mobile Account controls open the responsive dashboard.
Desktop includes section navigation, a profile overview, order summaries, saved
addresses, payment information and wishlist. Mobile uses summary cards and
compact order rows with navigation to the remaining sections.
The reference styling uses warm ivory surfaces, circular icon badges, aligned
desktop order columns, status pills and circular order-detail controls.
Mobile section pages retain a visible title and return-to-overview control.

- Live mode requires sign-in. Profile, orders and addresses load from existing
  `/me/profile`, `/me/orders` and `/me/addresses` endpoints. Loading, signed-out,
  failed (with retry) and empty states are explicit.
- Edit Profile uses the existing profile update form. Add Address uses the
  existing address creation endpoint and returns to the dashboard, not the bag.
  Address editing/deletion are not currently exposed in the storefront.
- Order rows expand actual line items, payment/fulfilment states and available
  tracking links. Counts reflect loaded account data, not screenshot numbers.
  The primary badge uses the order's `status` from the middleware, matching
  admin updates; an older shipment or fulfilment status does not override it.
  Live orders refresh every 30 seconds while the account/orders view is visible,
  when returning to the tab, or through the Refresh orders button.
- The order history follows the reference's larger cards, status tabs with
  counts, product/variant thumbnails, and prominent tracking/detail actions.
  Search by order number or product name. Overview shows the latest three;
  Your Orders shows the full loaded history. The mobile menu and post-checkout
  order overlay reuse the same order cards and details.
- Expand Order details for the order's saved delivery address (not the current
  profile address), contact email, subtotal/discount/shipping/tax/total,
  payment records, and all shipment tracking numbers and available dates.
  Missing address, charge, shipment, and item data are explicitly identified.
  Support links include the order number; returns link to the existing policy,
  not an unsupported return or refund workflow.
- Progress uses the current order status. Only supplied placement, shipping,
  and delivery dates are shown; no estimated arrival dates or milestone history
  are invented. `FULFILLED` does not imply `DELIVERED`; cancelled/payment-failed
  orders do not display an active delivery timeline. Tracking links require an
  HTTP(S) URL. Multiple shipments each retain their own tracking action.
- Signed-in wishlist hearts write to `/me/wishlist` and reload the authoritative
  profile wishlist. Guest and mock wishlists remain browser-local; guest items
  are not automatically merged on sign-in. Unavailable saved
  catalogue items are identified rather than replaced by sample products.
- Payment methods are selected securely at checkout; saved card details,
  payment-method counts and notification preferences are not fabricated.
  Notifications and Support explain unavailable integrations.
- Mock mode uses labeled sample profile, orders and addresses. Profile/address
  writes remain disabled; wishlist and product browsing still work.
- No avatar endpoint exists, so the dashboard uses a neutral profile icon.

## Integration verification

Run `npm test` for the API adapter regression tests, `npm run lint`, and
`MOCK=false npm run build` to validate a live build. No additional test
dependencies are needed.

The live integration check used the actual middleware application/database with
a temporary CORS-enabled listener, not fixture catalogue responses. It verified
58 API products rendered as 58 shop cards, backend hero copy/CTA, registration
and login, profile updates, server-persisted wishlist add/remove, address
creation, cart add/update/remove, and address-aware quotes. Two units at 9900
minor units produced a 19800 quote and a displayed INR 198 total. Cart and
account layouts had no horizontal overflow at 320, 390, and 1280 pixels.
Synthetic cart items, wishlist entries, and the address were removed afterward;
the synthetic customer account remains (there is no customer-delete API).

Launch prerequisites still include:

- Publish product photography (57 of the 58 checked products had no images)
  and collection sections (none were published in the checked response).
- Approve and publish policies; their current 409/unpublished states are
  intentionally rendered rather than exposing draft text.
- Confirm shipping, tax, and discount rules. The current middleware quote
  returns zero for these charges; the storefront does not invent rates.
- Complete an end-to-end Razorpay test payment and webhook/order-status check.
  The SDK failed to initialize in the verification browser, so no payment or
  order was created. The unavailable-SDK guard was verified instead; payment
  settlement and cross-reload recovery are not certified.
- Configure production API URL, HTTPS, CORS, and payment/webhook credentials.

## Shop catalogue

The shop displays active products from `GET /api/v1/products`, requesting pages
with `limit=100` and increasing `offset` until the complete catalogue is loaded.
It does not silently stop at the API's default 20 products. Loading, unavailable
(with retry), and empty states are explicit; mock products are not shown as live
stock.

- Four product columns on desktop, three on tablet, and two on mobile.
- Category tabs filter by `product_type`. Singular/plural and oversized clothing
  types map to the matching category; additional types get their own tabs.
- Search, gender, price range (INR), and in-stock filters combine with categories.
- Featured preserves API order; price ascending/descending and name sorting are
  available. Prices convert API minor units to major currency units.
- Product images, names, prices, and availability come from the backend.
  Circular image selectors switch actual product images, not invented colours.
  New/Bestseller badges are not fabricated without backend metadata.
- Hearts use the existing persisted wishlist. The plus button opens product
  options so customers choose a size before adding to their bag. Inactive
  variants are excluded, and sold-out products cannot be added.
- Shipping/return promises in the reference are not asserted without configured
  policies; the footer instead displays brand principles.

## Product detail experience

Selecting a product replaces the catalogue with a full-page product view under
the shared header, rather than opening a modal. A `#product/<slug>` fragment
restores the selection after reload and supports browser Back/Forward.
Breadcrumbs and the mobile back control return to the catalogue.

- Desktop thumbnail rail and large image; mobile swipe, image counter, dots,
  and arrow controls. Zoom opens an accessible native dialog.
- Published name, description, features, images, active size variants, and
  prices are used in live mode. Missing images have an explicit placeholder.
- Quantity is limited by variant stock minus the quantity already in the bag.
  The selected quantity is sent to the cart API and reflected in the mock bag.
  Size changes reset quantity, and unavailable variants cannot be added.
- Wishlist control, expandable details/fit/shipping sections, and up to six
  related active products (same category first).
- Mock mode includes sample ratings, a campaign story, six clothing sizes, and
  four colour variants with distinct demo SKUs. The sample gallery uses crops
  of preview photography, not the exact front/back artwork in the reference.
  Colours identify demo SKUs; they do not recolour the sample photograph.
- The current live middleware has no product ratings, colour metadata, size
  measurements, or product stories. These sample-only surfaces are not claimed
  as real data in live mode. Shipping/return promises are not fabricated.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
