# Folder Structure

## Purpose

This file explains the intended repository organization and where future work should go.

## Current structure

Expected source organization:

```text
src/
  app/
  components/
  hooks/
  lib/
  services/
docs/
public/
```

## Folder responsibilities

### `src/app/`

Next.js App Router routes, layouts, pages, route handlers, and server-rendered surfaces.

Use for:

- Route pages
- Auth callback/logout/login/signup route handlers
- Protected page entry points
- App layout integration

### `src/components/`

Reusable UI components.

Use for:

- Shared navigation/header components
- Auth UI controls
- Buttons/forms used in multiple pages

### `src/hooks/`

Reusable React hooks.

Use only for client-side behavior that is genuinely reusable.

### `src/lib/`

Shared application libraries and utilities.

Use for:

- Supabase helpers
- Auth/session helpers
- Logger
- Validation helpers
- Shared safe redirect/origin logic

### `src/services/`

Service-level abstractions for business or infrastructure operations.

Use for future:

- Suggestion service
- Capture processing
- Memory generation
- AI service wrappers

### `docs/`

Engineering documentation, runbooks, validation notes, and Project Memory.

## Folder rules

- Do not place business logic directly in UI components when it belongs in reusable helpers or services.
- Do not import server-only code into client components.
- Keep route handlers thin when possible.
- Prefer shared helpers for repeated auth, validation, and redirect logic.

## AI Context

Before adding a new folder, check whether an existing folder already owns that responsibility. Avoid premature architecture expansion.
