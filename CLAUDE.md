# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**MyCorner** is a React Native (Expo) mobile app for exploring and comparing city neighborhoods (London + New York) to help users decide where to live or visit. Users browse neighborhoods scored across metrics (safety, affordability, transit, etc.), set personalized preferences to re-rank them, save statuses/notes/ratings, plan itineraries with curated + Google Places spots, and compute commute times to their own destinations. Free vs. Pro tiers are gated via RevenueCat.

The package/app is named `mycorner` (the repo dir is `london-mobile-v2` for historical reasons).

## Commands

```bash
npm start                # Expo dev server (APP_ENV=development)
npm run start:staging    # dev server with staging env
npm run start:prod       # dev server with production env
npm run ios              # open iOS simulator
npm run android          # open Android
npm run clear            # start with cleared Metro cache
npm run typecheck        # tsc --noEmit — run this to verify changes (no test suite, no linter)

# EAS builds (require eas-cli auth)
npm run build:dev:sim    # dev client, iOS simulator
npm run build:prod:ios   # production iOS build
npm run submit:ios       # submit to App Store Connect (ascAppId 6758612578)
```

There is **no test runner and no ESLint config** in this repo. `npm run typecheck` is the only automated check — always run it after edits.

## Environment & Configuration

Config flows: `.env.{development,staging,production}` → `app.config.js` (`extra` block) → `config.ts` (typed exports via `expo-constants`). **Never read `process.env` at runtime in app code** — always import from `config.ts`. Switch envs with `APP_ENV=staging` prefix; each env maps to a distinct bundle ID (`com.mycorner.app{,.dev,.staging}`).

`config.ts` exposes `APP_ENV`, the `isDevelopment/isStaging/isProduction` flags, all API keys, feature flags (`ENABLE_ANALYTICS`, `ENABLE_DEBUG_LOGGING`), and `validateConfig()`. iOS uses **Apple Maps** for map display but still needs a Google key for Places/Geocoding; Android uses Google Maps. Keys are platform-split (`googleMapsApiKeyIos`/`Android`).

## Architecture

### Provider tree (`App.tsx`)
Nested providers, order matters: `SafeAreaProvider` → `ErrorBoundary` → `AuthProvider` → `SubscriptionProvider` → `PreferencesProvider` → `AppProvider` → `ToastProvider` → `AppNavigator`. PostHog and Sentry wrap the whole app conditionally. `AppProvider` (`contexts/AppContext.tsx`) is itself a barrel that nests `CityProvider` → `StatusComparisonProvider` → `NotesRatingsProvider` → `DestinationsProvider` → `ItineraryProvider`, and re-exports each context's hook (`useCity`, `useStatusComparison`, `useNotesRatings`, `useDestinations`, `useItineraries`). Import these hooks from `contexts/AppContext` for stability.

### State & persistence model
This is a **local-first** app. User state lives in React contexts backed by `AsyncStorage` (keys prefixed `@mycorner_`). When a user is logged in, state is **mirrored to Supabase** via the `useSyncToSupabase` / `useSyncRecordToSupabase` hooks (`hooks/useSyncToSupabase.ts`):
- Debounced (500ms), uses a "latest ref" pattern so changing `syncFn` doesn't reset the debounce.
- **Offline-aware**: when offline, sync is skipped and the operation is recorded in a module-level dirty set (`services/syncQueue.ts`). On reconnect, pending labels are re-synced (the queue stores *which* keys are dirty, not payloads — it re-syncs current state).
- `usePendingSyncCount()` drives the offline UI badge.

So the flow for any user-data change is: update context state → persist to AsyncStorage → (if logged in & online) debounced sync to Supabase; else mark pending.

### Supabase layer (`services/supabase/`)
`index.ts` is a barrel re-exporting everything. `client.ts` configures the client with AsyncStorage session storage. Each domain has its own repository file (`favorites`, `comparison`, `status`, `notes`, `ratings`, `destinations`, `account`, `auth`). DB rows are **snake_case**; `transformers.ts` maps them to camelCase domain types. Schema lives in `supabase-schema.sql` (tables: `user_favorites`, `user_comparison`, `user_neighborhood_status`, `user_neighborhood_notes`, `user_destinations`) plus `supabase-user-ratings-migration.sql`. Auth supports email, Google, and native Apple sign-in (see memory: Apple native sign-in uses the **bundle ID** as the Supabase Client ID, not a Services ID).

### Static data (`src/data/`)
Neighborhood content is **bundled static data**, not fetched. Each domain has `index.ts` + per-city files (`london.ts`, `new-york.ts`):
- `neighborhoods/` — core `Neighborhood` records (metrics 1–5, `diningStyle`, `vibe`, `borough`, optional `parentId` for sub-neighborhoods). `getNeighborhoodsByCity(cityId)` / `getNeighborhoodById(id)`. Also defines `METRIC_SOURCES` (official vs. editorial data provenance per metric per city).
- `coordinates/`, `boundaries/` — map markers and polygon boundaries.
- `curatedSpots/` — hand-picked `LocalSpot`s, indexed into a Map by `neighborhoodId` (`getCuratedSpots(id)`).
- `exploreSummaries/` — editorial neighborhood descriptions.
- `cities.ts` — the two supported cities; `DEFAULT_CITY_ID = 'london'`. The selected city scopes nearly everything in the UI.

### Live spots (Google Places)
Curated spots are static; **nearby spots come from Google Places** at runtime via `services/googleMaps.ts` (Nearby Search, Autocomplete, Geocoding, Directions). `hooks/useLocalSpots.ts` adds a 30-minute in-memory cache. Commute times to user destinations use the Directions API (`utils/commute.ts`, `hooks/useCommuteData.ts`).

### Metrics config (`config/metrics.ts`) — single source of truth
`METRICS` / `METRIC_MAP` / `METRIC_KEYS` define every scoreable dimension once (label, icon, filterable/sortable, numeric vs. categorical). FilterModal, SortModal, DetailScreen, PreferencesContext, and scoring all iterate this config — **add a new metric here**, not in each consumer. `vibe` is categorical and converted to a 1–5 score via `vibeToScore`.

### Personalization
`PreferencesContext` holds per-metric weights. `utils/personalizedScoring.ts` produces `ScoredNeighborhood` (a `personalizedScore` + per-criteria breakdown) by weighting metric scores. `utils/neighborhoodMatcher.ts` parses free-text and quiz answers into preference weights via keyword maps (drives the Matcher flow). `hooks/useFilteredNeighborhoods.ts` applies filters + sorting.

### Subscriptions / feature gating
`config/subscriptions.ts` defines `FEATURES` (each with `requiresLogin`, `freeLimit`, `proLimit`). `SubscriptionContext` wraps RevenueCat (`services/purchases.ts`). `hooks/useFeatureAccess.ts` is the **data-driven gate** — use `canAccess`, `getLimit`, `isLimitExceeded`, `requiresLogin`, `requiresUpgrade` rather than checking Pro status ad hoc. UI uses `<FeatureGate>` and the `Paywall` screen.

### Navigation (`navigation/AppNavigator.tsx`)
Bottom tabs (Home, Map, MyPlaces, Compare, Profile) inside a native stack. Heavy screens (Map, Detail, Destinations, Explore) are `React.lazy` + `Suspense` + `ErrorBoundary` wrapped to cut initial bundle parse. Profile tab shows `ProfileScreen` if a session exists, else `LoginScreen`. Paywall/Login/SignUp are modal-presented. Deep linking scheme is `mycorner://` (e.g. `mycorner://neighborhood/:id`).

## Conventions

- **Logging**: use `utils/logger.ts` (`logger.log/warn/error`), not `console.*` directly — it respects `ENABLE_DEBUG_LOGGING`.
- **Theme**: import `COLORS` (and typography helpers) from `constants/theme.ts`; don't hardcode colors. Use the shared `Typography`, `Button`, `Toast`, `EmptyState` components.
- **Domain types** live in `types/index.ts` (camelCase domain types + snake_case `*Row` DB types). Reuse `NeighborhoodStatus`, `Destination`, `TransportMode`, `UserRatings`, etc.
- **New Arch is enabled** (`newArchEnabled: true`). React 19 / RN 0.81 / Expo 54.
- When adding user-syncable data: add the repository fn in `services/supabase/`, the transformer, wire it through the relevant context with `useSyncToSupabase`, and add the table to `supabase-schema.sql`.
- When adding city content: add to **both** `london.ts` and `new-york.ts` (or it'll be missing for one city) and verify the `index.ts` aggregates it.
