---
name: local-dev
---

# local-dev — mycorner_mobile

How this sandbox was brought up during onboarding (validated 2026-10-30), and how to reproduce it.

## Result

`dev_stack_healthy: true` — Expo/Metro dev server boots and compiles the full app graph.

## Steps

1. **Env file** — copy `.env.example` → `.env.development`. Dummy values are fine locally:
   - `SUPABASE_URL=https://dummy-project.supabase.co`, `SUPABASE_ANON_KEY=dummy_local_dev_anon_key`
   - `GOOGLE_MAPS_API_KEY_IOS=dummy_local_dev_key`, `GOOGLE_MAPS_API_KEY_ANDROID=dummy_local_dev_key`
   - Leave `SENTRY_DSN`, `POSTHOG_API_KEY`, `REVENUECAT_API_KEY_*` empty.
   External services (Supabase, Google Places, Sentry, PostHog, RevenueCat) are cloud-only and optional to boot.
2. **Install** — `npm install` (npm is the tracked package manager; `bun.lock` is an untracked leftover, ignore it).
3. **Start** — `CI=1 APP_ENV=development npx expo start --port 8081` in the background. Check no process already holds 8081 first (`ss -tlnp | grep 8081`).
4. **Verify** (see Validation Summary below).

## Validation Summary (2026-10-30)

- `npx tsc --noEmit` → exit 0, no errors (the only automated check in this repo — no lint, no tests).
- `GET http://localhost:8081/status` → 200, `packager-status:running`.
- Primary flow: Metro compiled the complete app bundle for the native target —
  `GET /index.bundle?platform=ios&dev=true` → HTTP 200, 14.5 MB, **2048 modules** in 9.8 s.
- `platform=web` bundling fails by design: `react-native-web`/`react-dom` are not dependencies; the app is iOS/Android only. Do not treat this as a failure.
- No local DB exists (local-first app; no create/migrate/seed step).

## Gotchas

- Metro in `CI=1` mode disables watch/reload — fine for health checks, drop it for interactive work.
- `expo start` prompts interactively without `CI=1`; always run it non-interactively in scripts.
- Start the dev server from the repo root so `.env.development` is picked up (log line: `env: load .env.development`).
- No iOS/Android simulator exists in this sandbox — bundle compilation + typecheck is the deepest end-to-end verification available.
