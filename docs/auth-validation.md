# Authentication Validation (AIC-204)

This updates the earlier auth validation notes with Task 4.1 session persistence checks.

## Scope

This document records lightweight validation for the existing Supabase authentication integration and session persistence flow:

- Supabase auth helper wiring (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- signup form, login route, logout route, and auth callback flow
- middleware auth enforcement and redirect behavior (`middleware.ts`)
- session cookie detection and clearing helpers (`src/lib/auth/session-persistence.ts`)
- local/dev runtime sanity checks

No new auth provider or custom token storage was introduced as part of this task.

## What was validated

### 1) Login, logout, and callback flow

- Login UI continues posting credentials to `/auth/login`.
- Logout now posts through `/auth/logout`, signs out with the server-side Supabase client, and clears any detected Supabase session cookies before redirecting back to `/login`.
- Callback route still exchanges the auth code server-side and relies on cookie-aware Supabase SSR helpers for session persistence.

### 2) Supabase auth helper integration

- Browser helper uses `createBrowserClient(...)` with centralized public env access.
- Server helper uses `createServerClient(...)` with centralized public env access and cookie sync.
- Middleware uses `createServerClient(...)` and calls `supabase.auth.getUser()` for non-static routes while preserving refreshed cookies on redirects and normal responses.
- No direct `process.env` access was introduced in helper modules.

### 3) Session persistence design checks

- Server helper syncs auth cookies through the `next/headers` cookie store, which keeps App Router route handlers and server components aligned with Supabase SSR expectations.
- Middleware copies cookies from the Supabase response context onto redirect and pass-through responses, so refreshed sessions survive reloads and protected navigations.
- Session cookie utilities detect Supabase auth cookies by name, and logout clears those cookies explicitly after the server-side sign-out call.
- Browser helper remains singleton-scoped in-module and does not introduce manual token persistence.

These checks confirm persistence wiring is cookie-based rather than localStorage-only.

### 4) Middleware behavior checks

Validated against the middleware logic and local route smoke checks:

- Public routes remain accessible (`/` returned `200`; `/signup` returned `200`; `/login` returned `200` without a redirect loop).
- Unauthenticated redirect path is implemented for non-public routes:
  - destination: `/login`
  - safe continuation param: `next=<original path + query>`
- Redirect loop prevention is implemented by keeping `/signup`, `/login`, and `/auth/logout` out of protected-route redirects.
- Existing protected UI route `/dashboard` performs a server-side user check and redirects to `/login?next=%2Fdashboard` when no session exists.

### 5) Runtime auth sanity in local/dev flow

Local dev server was started successfully and handled route requests without runtime auth crashes:

- `GET /` → `200`
- `GET /signup` → `200`
- `GET /auth/callback?error=access_denied&error_code=otp_expired&type=signup` → `307` to `/signup?error=link_expired`
- `GET /login` → `200` (no redirect loop)
- `GET /private` → `307` to `/login?next=%2Fprivate`

No runtime auth exceptions were observed in the dev server log during these checks.

### 6) Automated coverage added

Added lightweight Node-based tests for the extracted session helper logic:

- Supabase session cookie detection, including chunked cookie names used during logout cleanup
- protected-route/public-route classification and safe login redirect path generation
- static asset bypass behavior used by middleware

## Validation commands run

Executed successfully:

- `npm run lint`
- `npm test`
- `npm run typecheck`
- `npm run build`

## Preview signup dependency note

- Manual signup validation for AIC-205 depends on the Task 5.1 Supabase migration `supabase/migrations/20260525014500_create_identity_profiles.sql`.
- Apply that migration to the Preview Supabase database before testing `/auth/signup`.
- If `public.identity_profiles` is missing, signup should still fail safely for the user, log a clear setup diagnostic on the server, and attempt auth-user rollback.

## Manual smoke-check checklist (for real Supabase creds)

When valid Supabase environment values and auth UI flow are available, run:

0. Apply `supabase/migrations/20260525014500_create_identity_profiles.sql` to the target Preview/local Supabase database and confirm `public.identity_profiles` exists.
1. Log in with a valid test user and confirm `/dashboard` loads.
2. Refresh the page and confirm the session remains active.
3. Close and reopen the browser/tab and confirm the user remains signed in while the session is valid.
4. Visit a protected route directly while authenticated and confirm access works without redirecting to `/login`.
5. Sign out from `/dashboard` and confirm the request redirects back to `/login`.
6. Try visiting `/dashboard` while signed out and confirm redirect to `/login?next=%2Fdashboard`.
7. Retry the signup email callback flow and confirm `/auth/callback` still establishes a valid session.
8. Confirm no auth/session errors appear in browser console or server/runtime logs during the above checks.
9. Validate signup creates both the Supabase Auth user and the matching `identity_profiles` row.
