# TheBetterOrder — full flow build

Big change set, one plan. Ship in the order below so each step compiles.

## 1. Branding: logo + wordmark

- Upload the provided logo to Lovable Assets (`src/assets/logo.png.asset.json`).
- Replace the current text-only lockup on `auth.tsx`, `_authenticated/onboarding.tsx`, and `_authenticated/app.tsx` with the logo image on top and a much larger `TheBetter` (sage) `Order` (orange) wordmark under it. Auth screen wordmark ≈ `text-6xl`, app header ≈ `text-3xl`, keep tagline "Healthy choices, anywhere".

## 2. Real live translations

- Wrap the app in a `LanguageProvider` (context + `useT()` hook) that reads/writes `localStorage.language` and exposes `t(key)`.
- Extend `src/lib/translations.ts` with every visible UI string across auth, onboarding, app shell, map, menu, checkout, gems (keys grouped by screen).
- Selecting a language on `/auth` now instantly re-renders the whole app in that language via `useT()` — no reload.
- Menu recs already accept `language` server-side; keep passing the active language.

## 3. Signup goes straight to personalization

- After successful email sign-up or Google OAuth, if `profiles.onboarded = false`, route to `/onboarding` (already exists) — remove any intermediate landing.
- Rebuild `/onboarding` as a single scrollable form (no map yet) collecting:
  1. Borough (dropdown: Manhattan / Brooklyn / Queens / Bronx / Staten Island)
  2. ZIP code (5-digit validated)
  3. Dietary needs/restrictions (multi-select from existing `RESTRICTIONS` + `HEALTH_CONDITIONS`)
  4. Budget (existing `BUDGETS`)
  5. Favorite fast-food restaurants (multi-select from the curated NYC list below)
- On submit: update `profiles` (add columns) and mark `onboarded = true`, then navigate to `/app`.

### New NYC chain list (`src/lib/chains.ts`)

Add a `NYC_FAVORITES` array grouped by category exactly as the user listed:
Burgers (Shake Shack, Five Guys, McDonald's, Burger King, Wendy's, 7th Street Burger), Chicken (Chick-fil-A, Popeyes, KFC, Raising Cane's, Wingstop, Jollibee, Bojangles), Mexican & Tex-Mex (Chipotle, Taco Bell, QDOBA, Moe's), Sandwiches (Subway, Jersey Mike's, Jimmy John's, Potbelly, Panera Bread), Pizza (Domino's, Pizza Hut, Papa John's, Little Caesars), Asian (Panda Express, Sarku Japan), Coffee & Breakfast (Dunkin', Starbucks, Tim Hortons), NYC Fast Casual (Shake Shack, Sweetgreen, Just Salad, Chopt, CAVA). Add matcher tokens for 7th Street Burger, Sarku Japan, Jollibee, CAVA so `matchChain` recognizes them.

## 4. Database schema (one migration)

Add to `profiles`:

- `borough text`
- `zip_code text`
- `favorite_chains text[] not null default '{}'`
- `gems_balance int not null default 0`

New tables (with GRANTs + RLS as per project rules):

- `gem_transactions(id, user_id, delta int, reason text, restaurant text, order_total_usd numeric, created_at)` — user can select/insert own.
- `rewards_catalog(id, name text, description text, gems_cost int, restaurant text, image_url text)` — `TO anon` + `authenticated` SELECT, seeded with tiered rewards (e.g. 250 gems = free drink, 500 = side, 1000 = entrée at chain of choice, 2000 = combo, 5000 = catering credit).
- `reward_redemptions(id, user_id, reward_id, gems_spent, created_at)` — user select/insert own; trigger deducts from `profiles.gems_balance` and refuses if insufficient.

## 5. Map of nearby favorites (`/app`)

- Use ZIP → lat/lng via existing `geocodeAddress` server fn (extend to accept ZIP).
- Load Google Maps JS with the browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`), `loading=async&callback=initMap`, plain `google.maps.Marker` only.
- Call `findNearbyFastFood`, filter to the user's `favorite_chains`, drop a pin per result.
- Click a pin → info card with name/address/distance + two buttons: **View menu** (in-app) and **Open in Google Maps** (deep-link `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>&query_place_id=<placeId>`).

## 6. Menu recommendations screen

Route: `/app/restaurant/$placeId` (new). Shows:

- Header with chain name + logo tile.
- Filter bar: budget (from BUDGETS) and restrictions (multi-select). Defaults from profile, editable per visit.
- Calls `recommendMenu` with the chain + filters + language.
- Results sorted by `healthScore` desc. Each item card shows:
  - Name, price, matchReason
  - Progress bars (0–100) for **Health %**, **Protein**, **Sugar**, **Sodium** (compute sodium via prompt update — add `sodium_mg` to schema), **Fiber**, **Fat**, plus calorie line.
  - "Add to order" button.

## 7. Checkout + gems

Route: `/app/checkout`. Shows selected items, subtotal, and a highlighted **"You'll earn X gems"** banner (1 gem per $1, rounded down). Buttons:

- **Order on DoorDash** → opens `https://www.doordash.com/search/store/<encodedChainName>+<encodedAddress>` in a new tab, then optimistically inserts a `gem_transactions` row (`delta = floor(total)`, reason `order`) and bumps `profiles.gems_balance`.
- **Back to menu**.

## 8. Rewards page

Route: `/app/rewards`. Shows `gems_balance` prominently, lists `rewards_catalog` cards with cost. Redeem button is disabled when balance < cost; on redeem, insert `reward_redemptions` (trigger enforces balance) and show a confirmation with a code.

## 9. Nav updates

App header gets three tabs: **Map**, **Rewards**, **Sign out**, plus gems balance chip.

## Technical notes

- All server writes go through `createServerFn` + `requireSupabaseAuth` (`src/lib/profile.functions.ts`, `gems.functions.ts`, `rewards.functions.ts`).
- Translations context lives in `src/lib/i18n.tsx`, mounted in `__root.tsx`.
- Keep sage/beige/orange tokens already in `styles.css`; add semantic classes only, no hardcoded colors.
- Map component must be `<ClientOnly>` and dynamically imported (Leaflet-style rule) since Google Maps touches `window`.
- DoorDash link-out is best-effort search; no order API.

## Out of scope (say so up front)

- No real DoorDash order placement (no public API).
- No native currency payments in-app.
- No admin UI for editing the rewards catalog (seed only).
