# Known Issues

## Purpose

This file tracks important resolved and active issues that future AI agents should understand.

## Resolved / previously observed

### Email confirmation redirect issues

Status: Resolved through auth callback and redirect refinements.

History:

- Email confirmation initially showed callback/localhost/404 issues during earlier auth/profile testing.
- Redirect generation and callback handling were refined.
- New signup confirmation email opens successfully and redirects into the app.

### Preview Supabase auth failure

Status: Resolved.

History:

- Successful auth validation was initially blocked by preview environment auth failures.
- Runtime issue was identified and fixed.
- Signup, email confirmation, Supabase user creation, login, and dashboard access later passed.

### Missing identity profile migration in Preview

Status: Resolved.

History:

- AIC-205 Task 5.2 manual validation failed initially because Preview Supabase database was missing the identity profile migration.
- Migration was applied and signup/profile creation passed.

### Dark dropdown readability in profile preferences

Status: Resolved.

History:

- Preference dropdown options were difficult to read in dark UI.
- Fixed during AIC-205 Task 5.4.

### Duplicate authenticated navigation controls

Status: Resolved.

History:

- Dashboard/Profile/Sign out controls appeared in multiple places.
- AIC-206 Task 6.2 made AppHeader the single auth navigation source.

### Auth-origin/forwarded-header hardening

Status: Resolved through AIC-206 Task 6.4 follow-up PRs.

History:

- Same-host auth request issue and forwarded header trust boundaries were hardened.
- Untrusted forwarded headers no longer widen allowed origins.
- Trusted forwarded-origin behavior remains opt-in.

## Active known issues

No active blocking known issues recorded as of Project Memory v1.0.

## AI Context

If a previously resolved issue reappears, check the related auth/profile/session areas before adding new patterns.
