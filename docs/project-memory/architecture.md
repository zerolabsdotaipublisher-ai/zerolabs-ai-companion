# Architecture

## Framework

The project uses the Next.js App Router for routing and building the application interface.

## Directory Structure

The codebase follows a `src/`-based structure with specific separation of concerns:

- `src/app/`: Next.js App Router entry points (routes, layouts, pages, global styles). Handles route composition and top-level UI wiring.
- `src/components/`: Reusable presentational and UI components. Framework and UI focused, devoid of infrastructure logic.
- `src/hooks/`: Shared React hooks for client-side state and behavior.
- `src/lib/`: Cross-cutting utilities, constants, and helpers used across the application. Generic in nature.
- `src/services/`: Service-layer modules coordinating domain operations and external integrations. Acts as the boundary between UI and implementation APIs.
- `docs/`: Project documentation, setup guides, and architecture notes.

## Separation of Concerns

Routing and UI code (`app`, `components`, `hooks`) are separated from generic utilities (`lib`) and domain orchestration (`services`). Documentation is strictly isolated in `docs/`.
