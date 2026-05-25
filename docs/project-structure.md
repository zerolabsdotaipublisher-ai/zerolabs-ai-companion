# Project Structure

This project uses a `src/`-based Next.js layout to keep product code grouped in one place.

## Folder responsibilities

- `src/app/`
  - Next.js App Router entry points (routes, layouts, pages, global styles).
  - Owns route composition and top-level UI wiring.

- `src/components/`
  - Reusable presentational and UI composition pieces.
  - Should stay framework/UI focused and avoid infrastructure concerns.

- `src/hooks/`
  - Shared React hooks for client-side state and behavior.
  - Keeps reusable interaction logic out of page/component files.

- `src/lib/`
  - Cross-cutting utilities, constants, and small helpers used in multiple areas.
  - Should remain generic and avoid business-process orchestration.

- `src/services/`
  - Service-layer modules that coordinate domain operations and external integrations.
  - Acts as a boundary between UI code and implementation-specific backends/APIs.

- `docs/`
  - Project documentation, setup guides, and architecture notes.
  - Keeps operational and design context separate from runtime source code.

- `supabase/`
  - Database migrations and Supabase-specific schema assets.
  - Keeps application-owned Postgres changes versioned alongside the app codebase.

## Separation of concerns

The structure separates routing/UI concerns (`app`, `components`, `hooks`) from shared foundations (`lib`) and domain/integration orchestration (`services`), while all explanatory material stays in `docs`.
