# System Architecture

## Purpose

This file describes the current and intended architecture for AI Companion.

## Current architecture state

AI Companion is currently a Next.js App Router web application deployed on Vercel with Supabase used for authentication and database-backed identity/profile data.

Current layers:

```text
Browser UI
→ Next.js App Router
→ Server routes / Server Components
→ Supabase Auth
→ Supabase Postgres
→ Vercel deployment/runtime
```

## Current implemented subsystems

- Application shell and route structure
- Authentication middleware
- Signup/login/logout flows
- Auth callback handling
- Session persistence
- Protected route enforcement
- Identity profile schema
- Profile management UI
- Personalization preference persistence
- Centralized environment/config validation
- Logger and lightweight monitoring foundation

## Planned future architecture

Future MVP layers:

```text
Today screen
→ Suggestion engine
→ User action
→ Capture processor
→ AI memory summarizer
→ Timeline storage
```

Future scale layers:

```text
Postgres structured memory
→ Storage provider for media
→ OpenAI generation/summarization
→ Qdrant semantic memory
→ ZeroFlow orchestration/cost tracking
```

## Architecture principles

- Product app remains independent.
- Keep MVP simple.
- Do not prematurely integrate ZeroFlow.
- Do not introduce Qdrant until semantic retrieval adds clear value.
- Do not build complex life graph/travel/story systems during MVP foundation.
- Server-side authentication remains authoritative.
- Central configuration is the only approved path for environment access.

## Protected application areas

Current protected routes include:

- `/dashboard`
- `/profile`

Authenticated users may access these routes. Unauthenticated users must be redirected safely to `/login`.

## AI Context

When modifying architecture:

- Preserve Supabase Auth as the auth provider.
- Preserve App Router conventions.
- Preserve server-side session validation.
- Avoid cross-product coupling.
- Keep changes scoped to the Jira ticket.
