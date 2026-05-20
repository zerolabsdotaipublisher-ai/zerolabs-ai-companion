# Authentication Validation (AIC-202)

This updates the earlier auth validation notes with Task 2.4 signup lifecycle checks.

## Scope

This document records lightweight validation for the existing Supabase authentication integration and signup lifecycle:

- Supabase auth helper wiring (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- signup form, signup route, and auth callback flow
- middleware auth enforcement and redirect behavior (`middleware.ts`)
- local/dev runtime sanity checks

No new product/auth features were added as part of this validation task.

## What was validated

### 1) Signup and callback flow

- Signup UI validates email, password length, and password confirmation before posting to `/auth/signup`.
- Signup route re-validates on the server, sets `emailRedirectTo` to `/auth/callback`, and maps duplicate-email responses to a clean `409` message.
- Callback route redirects verification failures back to `/signup?error=...` and now surfaces those errors on the signup page.

### 2) Supabase auth helper integration

- Browser helper uses `createBrowserClient(...)` with centralized public env access.
- Server helper uses `createServerClient(...)` with centralized public env access and cookie sync.
- Middleware uses `createServerClient(...)` and calls `supabase.auth.getUser()` for non-static routes.
- No direct `process.env` access was introduced in helper modules.

### 3) Session persistence design checks

- Server helper syncs auth cookies through `next/headers` cookie store.
- Middleware copies cookies from Supabase response context onto redirect/next responses.
- Browser helper is singleton-scoped in-module, supporting stable client reuse across navigation.

These checks confirm persistence wiring is present in the existing implementation.

### 4) Middleware behavior checks

Validated against the middleware logic and local route smoke checks:

- Public routes remain accessible (`/` returned `200`; `/signup` returned `200`; `/login` returned `200` without a redirect loop).
- Unauthenticated redirect path is implemented for non-public routes:
  - destination: `/signup`
  - safe continuation param: `next=<original path + query>`
- Redirect loop prevention is implemented by keeping `/signup` and `/login` in the public-route allowlist.

Note: the current app snapshot has no implemented protected page route, so practical redirect behavior for an existing protected UI route should be re-checked once such a route exists.

### 5) Runtime auth sanity in local/dev flow

Local dev server was started successfully and handled route requests without runtime auth crashes:

- `GET /` → `200`
- `GET /signup` → `200`
- `GET /auth/callback?error=access_denied&error_code=otp_expired&type=signup` → `307` to `/signup?error=link_expired`
- `GET /login` → `200` (no redirect loop)
- `GET /private` → `307` to `/signup?next=%2Fprivate`

No runtime auth exceptions were observed in the dev server log during these checks.

## Validation commands run

Executed successfully:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Not available in this repository:

- `npm test` (no `test` script defined)

## Manual smoke-check checklist (for real Supabase creds)

When valid Supabase environment values and auth UI flow are available, run:

1. Sign in and confirm a session cookie is set.
2. Register a new user and confirm the UI shows the email-verification success message.
3. Submit an existing email and confirm the duplicate-account error is shown cleanly.
4. Submit invalid signup data and confirm field-level validation appears client-side and server-side.
5. Open the verification link and confirm `/auth/callback` redirects to `/` with a valid session.
6. Retry an expired or invalid verification link and confirm `/signup?error=...` shows the callback error message.
7. Refresh an authenticated page and confirm session remains valid.
8. Open a protected route while signed out and confirm redirect to `/signup?next=...`.
9. Open public routes (`/`, `/login`, `/signup`) while signed out and confirm no redirect loops.
10. Open `/login` on desktop and mobile, confirm the password field is masked, and verify client-side email/password validation appears before submit.
11. Confirm the `/login` page links to `/signup`.
