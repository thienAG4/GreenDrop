# GreenDrop Terrarium

Full-stack e-commerce app for a terrarium shop: catalog, cart, checkout,
orders, Builder (AI/3D terrarium design), returns & refunds, reviews, and
promotions — plus a separate admin panel. **Node.js/Express + MySQL 8**
backend (Routes → Controllers → Services) and an **AngularJS 1.x +
Bootstrap 5** frontend. Coding conventions and architecture philosophy live
in `AGENTS.md` — read that before writing any code.

## Repo layout

```
docker-compose.yml      # MySQL 8 + backend API, wired together
backend/
  create_database.sql   # schema (24 tables) — see "Database schema" below
  init.sql               # seed data
  app.js, server.js
  config/db.js           # mysql2/promise pool
  routes/ controllers/ services/   # Routes → Controllers → Services
  middleware/            # auth (JWT), multer upload, error handler
  utils/constants.js     # business-rule constants & enum mappings (read this first)
  uploads/               # product/review/return/blog images (or a docker volume)
client/
  index.html             # single entry point, loads AngularJS + Bootstrap via CDN
  app.js, app.routes.js   # module definition, ngRoute config (all routes)
  services/ controllers/ directives/ filters/   # one module ('app'), flat by feature
  views/                 # HTML partials matching each route
  css/                   # tokens.css (design tokens) + components.css + layout.css
admin/
  Standalone admin panel, split out of client/ - own AngularJS module
  ('adminApp'), own index.html/port/login, same conventions/design tokens as
  client/ but no shared Angular module. See "Admin panel" below.
```

## Quick start (Docker Compose — recommended)

Requires Docker.

```bash
docker compose up -d --build
```

This builds the backend image, starts MySQL 8, and automatically loads
`backend/create_database.sql` then `backend/init.sql` on first boot (via
`docker-entrypoint-initdb.d`). The API comes up on **http://localhost:4000**.

```bash
curl http://localhost:4000/api/health
# {"data":{"status":"ok"}}
```

Reset the database (wipes all data and re-seeds from the SQL files):

```bash
docker compose down -v && docker compose up -d --build
```

## Running the frontend

Plain static files, no build step (AngularJS 1.x, not modern Angular) — but
`ngRoute`'s `templateUrl` partials are blocked by CORS under `file://`, so
**serve it over HTTP**:

```bash
cd client
npm install
npm start   # http-server on http://localhost:8080, caching disabled
```

Open **http://localhost:8080/** with the backend running on port 4000. The
API base URL is set in `client/app.js` (`API_BASE_URL` constant).

## Admin panel

A **separate standalone app** at `admin/` — own AngularJS module
(`adminApp`), own login screen, own port. Talks to the same backend API and
staff/admin accounts, but doesn't share a browser origin with `client/`
(logging into one doesn't log you into the other).

```bash
cd admin
npm install
npm start   # http://localhost:8081
```

Covers: products, Combo Builder (admin-authored designs), categories, orders,
returns & refunds, customers, review moderation, vouchers, promotion events,
banners, and blog CRUD, plus a revenue/top-product dashboard.

## Seeded accounts

Every seeded user shares one bcrypt-hashed password: **`greendrop123`**.

- Admin: `admin@greendrop.com`
- Staff: `lily@greendrop.com`, `tom@greendrop.com`
- Customers: `alice@example.com`, `bob@example.com`, `carol@example.com`,
  `dave@example.com`, or `customerN@example.com` (N = 8-37)

Register a new account via the frontend or `POST /api/auth/register`, or use
"Quên mật khẩu" (prints its verification code to the backend console log —
simulated email).

## Database schema

`backend/create_database.sql` defines **24 tables / 34 FK relationships**,
grouped by feature:

- **Identity**: `USERS`, `ADDRESS`
- **Catalog**: `CATEGORIES`, `PRODUCTS`, `IMAGES`, `PRODUCT_ATTRIBUTES`, `PRODUCT_FAQS`
- **Combo Builder**: `COMBOS`, `COMBO_ITEMS`
- **Cart**: `CARTS`, `CART_ITEMS`
- **Orders**: `ORDERS`, `ORDER_ITEMS`, `ORDER_ITEM_COMPONENTS`
- **Returns & refunds**: `RETURN_REQUESTS`, `RETURN_ITEMS`, `REFUNDS`
- **Reviews**: `REVIEWS`
- **Promotions**: `VOUCHERS`, `PROMOTION_EVENTS`, `PROMOTION_EVENT_PRODUCTS`, `BANNERS`
- **Ops**: `AUDIT_LOGS`, `BLOG_POSTS`

Two deviations from the original schema draft:

- **`IMAGES` replaces a private `PRODUCT_IMAGES` table.** A shared table
  (`product_id` nullable, `combo_id` nullable, `is_combo` flag) lets both
  `PRODUCTS` and `COMBOS` hang a 1-M image gallery off one table;
  `sort_order = 1` is always the thumbnail. MySQL 8 won't allow a CHECK
  constraint on a column that also carries an `ON UPDATE/DELETE CASCADE` FK,
  so "exactly one of `product_id`/`combo_id` is set" is enforced in
  `backend/services/products.service.js`, not in SQL.
- **`BLOG_POSTS` was added** to back a real admin-managed blog (previously
  hardcoded frontend content) — `created_by_user_id → USERS`, `ON DELETE RESTRICT`.

## Business processes & rules

The app implements 7 core business processes:

1. **Product discovery & purchase** — guests and customers browse/search,
   add to cart, and check out (COD or a simulated online gateway with a QR
   code). At most one voucher per order; online payment keeps the QR valid
   for 15 minutes.
2. **Builder purchase (AI or 3D)** — a design needs at least one pot and one
   substrate soil (BR-02) before it can be saved or added to cart; only
   in-stock components are usable, and Builder products carry an extra
   assembly fee at checkout.
3. **Order cancellation & refund** — customers can cancel only while an
   order is in the pre-shipping "preparing" state; COD cancellations need no
   refund, online payments trigger an automatic gateway refund (falling back
   to manual admin processing on failure).
4. **Return & refund** — return requests must be filed within a deadline of
   the order's `DELIVERED` status (48h for damage/shipping-error reasons, 7
   days for latent-defect reasons) with at least one evidence image; accounts
   with more than 3 return requests in 180 days are flagged for manual
   review. Refunds only fire after the returned item is physically received
   and inspected.
5. **Product reviews** — only for products from the reviewer's own
   `DELIVERED` orders, one review per order, 1-5 star rating, with basic
   spam/profanity filtering before publishing.
6. **Product management** — admin-only CRUD; a product can't be deleted
   while it's in an order that's still pending/preparing.
7. **Promotion creation** — admin-only vouchers/banners/promotion events,
   each with a start/end date window; expired or not-yet-active promotions
   are hidden or rejected automatically.

The original spec left "how is a combo product modeled?" open between three
options; this build resolved it as **both** — a combo is a real product row
(name, price) **and** is defined by its component items.

## API overview

All responses use `{ data, message }` on success or `{ error }` on failure.
Auth uses `Authorization: Bearer <token>`. Guests carry a client-generated
`X-Session-Token` header to identify their cart/checkout across requests.

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `GET /me`, `/forgot-password`, `/verify-reset-code`, `/reset-password`, `/change-password` |
| Users | `PUT /api/users/me`, addresses CRUD under `/api/users/me/addresses`, admin user list/status |
| Catalog | `GET /api/categories`, `GET /api/products` (search/filter/sort/paginate), `GET /api/products/:id`, admin CRUD |
| Cart | `GET/POST/PUT/DELETE /api/cart` (guest via header, customer via token) |
| Builder | `POST /api/combos` (AI or 3D design), `/ai-preview`, `/mine`, update/delete |
| Checkout/Orders | `POST /api/orders`, `GET /mine`, `/admin`, `/track`, `/:id`, payment confirm, cancel, status transitions |
| Returns/Refunds | `POST /api/returns` (with evidence images), `/:id/tracking`, admin approve/reject/item-received, `/api/returns/refunds` admin view + retry |
| Reviews | `POST /api/reviews` (multipart, optional image), `GET /api/reviews/product/:id`, `/mine`, admin moderation |
| Promotions | `GET /api/vouchers/active` (public), vouchers/promotion events/banners admin CRUD |
| Audit logs | `GET /api/audit-logs` (admin) |

## Key simplifications vs. the original spec

The schema is treated as fixed (aside from the two deviations above); where
the business rules or design needed something the schema has no column for,
the workaround is centralized in **`backend/utils/constants.js`**:

- Order/return status enums (`pending/confirmed/shipping/delivered/cancelled/returned`,
  `pending/approved/rejected/completed`) stand in for the business doc's
  longer-named statuses.
- `CART_ITEMS` has no `quantity` column — one row per unit instead.
- `COMBOS.created_by_user_id` and `ORDERS.user_id` are `NOT NULL`, so guest
  Builder saves require login, and guest checkout transparently creates a
  lightweight `USERS` row behind the scenes.
- `REFUNDS.return_id` is `NOT NULL` — an order-cancellation refund is
  recorded as a system-generated `RETURN_REQUESTS` row.
- Payment gateways (MoMo/VNPay/QR) and email/SMS are **simulated**, not wired
  to real providers.
- Password reset codes live in an in-memory `Map` (lost on backend restart).
- The wishlist and 3D Terrarium Studio's canvas are client-only
  simplifications (no backing tables; the "3D" studio is a 2D click/drag canvas).
- The Combo Builder's AI preview calls Pixazo's SDXL Base 1.0 API when
  `PIXAZO_API_KEY` is set, otherwise falls back to a placeholder image.

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `JWT_SECRET` | Signing key for auth tokens — set a real random value |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `PUBLIC_UPLOADS_URL` | Base URL used to build links to uploaded images |
| `PIXAZO_API_KEY` | Optional. Pixazo API key for the Combo Builder's real AI preview image. Unset = simulated placeholder. |

## Manual backend setup (no Docker)

1. Have MySQL 8 running locally.
2. Load the schema and seed data:
   ```bash
   mysql -uroot -p < backend/create_database.sql
   mysql -uroot -p < backend/init.sql
   ```
3. Configure the backend:
   ```bash
   cd backend
   cp .env.example .env
   # edit .env with your DB credentials
   npm install
   npm start          # or: npm run dev (auto-restart on file changes)
   ```

## Status

Done: full schema + seed data, Docker Compose environment, the full backend
API (auth, catalog, cart, Builder, checkout, cancellation/refunds, returns,
reviews, promotions, audit logging), and the full AngularJS frontend
(storefront, cart/checkout/payment, account area, order/return flows, Combo
Builder, admin panel, static content pages).

Known gaps / intentionally out of scope: real 3D rendering, real payment
gateway integration, real email/SMS delivery, wishlist/blog persistence
handled client-side where noted above.
