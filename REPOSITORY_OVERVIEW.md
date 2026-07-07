# Repository Overview

## Project Architecture

This project is an AI Companion MVP built with Next.js. It uses a `src/`-based Next.js layout to keep product code centralized. The architecture deliberately separates routing and UI concerns (`app`, `components`, `hooks`) from shared foundational logic (`lib`) and domain/integration orchestration (`services`).

## Tech Stack

The application is built using the following core technologies:

- **Framework:** Next.js (App Router)
- **UI Library:** React
- **Styling:** Tailwind CSS (v4)
- **Language:** TypeScript
- **Tooling:** ESLint, Prettier
- **Environment:** Node.js (>= 20)

## Folder Structure

The repository is structured to maintain clean separation of concerns:

- `src/app/`: Next.js App Router entry points (routes, layouts, pages, global styles). Owns route composition and top-level UI wiring.
- `src/components/`: Reusable presentational and UI composition pieces. Remains framework/UI focused, avoiding infrastructure concerns.
- `src/hooks/`: Shared React hooks for client-side state and behavior. Keeps reusable interaction logic out of page and component files.
- `src/lib/`: Cross-cutting utilities, constants, and small helpers used in multiple areas. Generic functions that avoid business-process orchestration.
- `src/services/`: Service-layer modules that coordinate domain operations and external integrations. Acts as a boundary between UI code and implementation-specific backends or APIs.
- `docs/`: Project documentation, setup guides, and architecture notes. Keeps operational and design context separate from runtime source code.

## Authentication Flow

Platform integrations, including authentication (as well as Supabase, OpenAI, Qdrant, payments, storage, and ZeroFlow services), are intentionally deferred to later tasks. Currently, no authentication flow is implemented in the repository.

## Routing Overview

The application utilizes the Next.js App Router. All routing concerns, along with top-level layouts and pages, are managed within the `src/app/` directory. Currently, the application consists of a single root path managed by `src/app/page.tsx` and `src/app/layout.tsx`.
