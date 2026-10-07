# Bike Tools

A privacy-minded monorepo for small bike workshop applications. The first app is **Spoke Bench**, a browser-based wheel tension manager.

## Workspace

- `apps/tension` — React/Vite application and Netlify Functions
- `packages/auth` — Firebase client authentication
- `packages/db` — browser API client and server-only Firebase/Supabase helpers
- `packages/bike-core` — pure domain types and tension calculations
- `supabase/migrations` — PostgreSQL schema

## Setup

1. Run `pnpm install`.
2. Copy `apps/tension/.env.example` to `apps/tension/.env` and fill in Firebase and Supabase values.
3. Apply the SQL migration to an EU-region Supabase project.
4. Enable Google, Apple, and Facebook providers in Firebase Authentication.
5. Run `pnpm --filter @bike-tools/tension dev` for the frontend only, or `npx netlify-cli dev --filter @bike-tools/tension` from the repository root to exercise the app and Functions together.

The Firebase web configuration is public by design. `FIREBASE_SERVICE_ACCOUNT_JSON` and `SUPABASE_SERVICE_ROLE_KEY` are server-only and must be configured in Netlify, never with a `VITE_` prefix.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Security model

All authenticated API requests carry a Firebase ID token. Netlify Functions verify the token and derive the trusted UID before querying Supabase. Client-provided owner IDs are never accepted. Supabase tables are inaccessible to public browser roles.
