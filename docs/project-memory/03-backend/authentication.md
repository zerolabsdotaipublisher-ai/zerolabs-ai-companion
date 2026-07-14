# Authentication

## Purpose

This file documents the current authentication and session architecture.

## Provider

AI Companion uses Supabase Auth.

## Implemented authentication capabilities

Implemented through AIC-201 to AIC-206:

- Supabase browser/server auth clients
- SSR-safe cookie/session handling
- Authentication middleware
- Public/protected route classification
- Signup UI and backend flow
- Email verification callback handling
- Login UI and backend flow
- Invalid credential handling and safe user messaging
- Session persistence
- Server-side session validation
- Session refresh handling
- Logout route and UI
- Auth state-aware header/navigation
- Unauthorized route handling
- Protected route validation

## Current auth routes/pages

Important routes include:

- `/signup`
- `/login`
- `/auth/callback`
- `/auth/logout`
- `/dashboard`
- `/profile`

## Protected routes

Current protected routes:

- `/dashboard`
- `/profile`

Unauthenticated users must redirect safely to `/login`.

## Logout behavior

Logout must:

- Clear the Supabase session.
- Clear authenticated UI state.
- Redirect safely to `/login`.
- Prevent browser back from exposing protected UI.
- Keep direct protected route access blocked after logout.

## Redirect/origin safety

Auth routes include protections for state-changing requests and redirect values.

Important principles:

- Treat `next`/redirect parameters as untrusted input.
- Reject malformed, external, scheme-relative, auth-loop, and unsafe redirects.
- Same-origin validation must remain strict.
- Forwarded-origin trust must remain opt-in and strictly validated.
- Untrusted forwarded headers must not widen allowed origins.

## Known completed validation

AIC-206 validation confirmed:

- Valid login
- Authenticated protected route access
- Logout redirect
- Auth UI clearing after logout
- Browser back after logout does not reveal protected content
- Refresh after logout remains logged out
- Direct logged-out protected route access redirects safely
- Re-login restores access

## AI Context

Authentication is a sensitive area. Do not modify middleware, redirect validation, logout behavior, or forwarded-origin trust logic unless the Jira task explicitly requires it. Add regression tests for any auth/security change.
