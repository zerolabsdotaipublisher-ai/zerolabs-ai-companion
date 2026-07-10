# QA Checklist

## Purpose

This file captures repeatable manual QA patterns for AI Companion.

## Authentication QA

Use after any auth/session/profile change.

- Login page loads.
- Signup page loads.
- Invalid login shows safe user-facing error.
- Valid login succeeds.
- Authenticated `/dashboard` loads.
- Authenticated `/profile` loads.
- Refresh while authenticated preserves access.
- Logout redirects to `/login`.
- Authenticated navigation clears after logout.
- Browser Back after logout does not reveal protected UI.
- Direct logged-out `/dashboard` redirects to `/login`.
- Direct logged-out `/profile` redirects to `/login`.
- Re-login restores protected access.

## Profile QA

- New user has identity profile provisioned.
- `/profile` loads for authenticated user.
- Profile fields save successfully.
- Saved values persist after refresh.
- Preference defaults load when missing.
- Preference updates persist.
- Invalid JSON or invalid field values show validation messages.
- No duplicate profile row is created.
- Logged-out users cannot update profile.

## Deployment QA

- Vercel preview reaches Ready.
- Preview route loads without 404/runtime crash.
- Production deployment only after validated merge flow.
- No secrets appear in logs or committed files.

## Quality checks

Run where applicable:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- CodeQL/security scan

## AI Context

For validation-only tasks, no production-code PR may be needed. If no code changes are required, document validation results clearly.
