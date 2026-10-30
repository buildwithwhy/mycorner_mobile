# obvious.md — mycorner_mobile

**Repo:** `buildwithwhy/mycorner_mobile` — **MyCorner**, a React Native (Expo) mobile app for exploring and comparing city neighborhoods (London + New York). Local-first: user state lives in AsyncStorage-backed contexts, mirrored to Supabase when signed in.

## Stack

- React Native 0.81.5 / Expo 54 / React 19 / TypeScript 5.9 (new architecture enabled)
- Node v20.20.x, npm (package-lock.json is tracked — use npm, not yarn/bun)
- Entry: `index.ts` → `App.tsx` (nested provider tree)
- No test runner and no ESLint config — `npm run typecheck` is the only automated check

## Commands

```bash
npm start            # Expo dev server (Metro), APP_ENV=development
npm run ios          # launch iOS simulator
npm run android      # launch Android emulator
npm run clear        # start with cleared Metro cache
npm run typecheck    # tsc --noEmit — always run after edits
```

The dev server (Metro) listens on port **8081** by default (`expo start --port N` to change). Start it non-interactively in CI with `CI=1 npm start`.

## Environment

Copy `.env.example` → `.env.development`. Values flow `.env.*` → `app.config.js` (`extra`) → `config.ts` (typed exports via expo-constants). Switch envs with `APP_ENV=staging|production`. In sandbox/local dev, dummy values for `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `GOOGLE_MAPS_API_KEY_*` preserve startup behavior; Supabase, Google Places, Sentry, PostHog, and RevenueCat are external cloud services and are not required to boot the dev server.

## Codebase map

See [codebase-map.md](codebase-map.md). Highlights:

- `src/data/` — neighborhood content is bundled static data (per-city files: `london.ts`, `new-york.ts`); add city content to **both**.
- `src/config/metrics.ts` — single source of truth for scoreable metrics; add new metrics here.
- `src/services/supabase/` — one repository file per domain; snake_case rows mapped by `transformers.ts`. Schema: `supabase-schema.sql`.
- `src/contexts/` — local-first state; sync via `hooks/useSyncToSupabase.ts` (debounced, offline-aware).
- `hooks/useFeatureAccess.ts` + `<FeatureGate>` — the data-driven Pro-tier gate.

## Local verification

1. `npm run typecheck` — must exit 0.
2. Start dev server, confirm `GET http://localhost:8081/status` → 200 `packager-status:running`.
3. Compile the app graph: `curl 'http://localhost:8081/index.bundle?platform=ios&dev=true'` → HTTP 200 (≈2,000 modules). The `platform=web` bundle fails by design — `react-native-web`/`react-dom` are not dependencies; the app targets iOS/Android only.

No local database: this is a local-first app; no create/migrate/seed step exists.

## Snapshot

Captured from this setup run's live sandbox: template `dn8inpn3hwwr1n36p1xq:default` at 2026-10-30T17:30:49Z.
