# Codebase map — mycorner_mobile

Depth cap 2. Counts are `.ts`/`.tsx` files.

| Path | Purpose |
|---|---|
| `App.tsx`, `index.ts` | App entry; nested provider tree (order matters) |
| `app.config.js` | Expo config; reads `process.env` at build time |
| `config.ts` | Typed config exports via expo-constants (never read `process.env` at runtime) |
| `src/components/` (37) | Shared UI: `Typography`, `Button`, `Toast`, `EmptyState`, `FeatureGate`, modals |
| `src/screens/` (13) | Tab & modal screens: Home, Map, Compare, MyPlaces, Detail, Explore, Matcher, Login/SignUp, Paywall, Profile |
| `src/navigation/` (2) | `AppNavigator.tsx` — bottom tabs + native stack; deep link scheme `mycorner://`; heavy screens lazy-loaded |
| `src/contexts/` (10) | Local-first state providers; `AppContext.tsx` is the barrel — import `useCity`, `useNotesRatings`, etc. from it |
| `src/hooks/` (9) | `useSyncToSupabase`, `useLocalSpots`, `useCommuteData`, `useFilteredNeighborhoods`, `useFeatureAccess` |
| `src/services/` (17) | `supabase/` (client + per-domain repositories + transformers), `googleMaps.ts` (Places/Geocoding/Directions), `purchases.ts` (RevenueCat), `syncQueue.ts` |
| `src/data/` (16) | Bundled static content per city: neighborhoods, coordinates, boundaries, curated spots, explore summaries |
| `src/config/` (2) | `metrics.ts` (single source of truth for metrics), `subscriptions.ts` (feature tiers/limits) |
| `src/constants/` (2) | `theme.ts` (colors/typography) |
| `src/types/` (1) | `index.ts` — domain types (camelCase) + DB row types (snake_case) |
| `src/utils/` (8) | `personalizedScoring.ts`, `neighborhoodMatcher.ts`, `commute.ts`, `logger.ts` |
| `scripts/` | One-off data tooling (boundary generation, image processing); not part of the app |
| `assets/`, `src/assets/` | App icons, splash, images |
| `supabase-schema.sql` (+ ratings migration) | Supabase schema — the only DB definition |
