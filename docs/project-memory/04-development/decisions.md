# Architecture Decision Record

## ADR-001 — AI Companion remains an independent product app

Decision: AI Companion is its own product application and repository.

Reason: Product workflows, UI, prompts, schemas, analytics, and business rules should remain product-specific. Shared services may come later through ZeroFlow, but the product should not be coupled prematurely.

## ADR-002 — Use Next.js App Router

Decision: Use Next.js App Router for the web application.

Reason: Supports modern route organization, server components, route handlers, and Vercel deployment alignment.

## ADR-003 — Deploy on Vercel

Decision: Vercel is the deployment platform for preview and production deployments.

Reason: It provides fast iteration, GitHub integration, preview deployments, and minimal infrastructure overhead.

## ADR-004 — Use Supabase Auth

Decision: Supabase Auth is the authentication provider.

Reason: Reduces custom auth complexity and aligns with Supabase Postgres identity/profile data.

## ADR-005 — Server-side session validation is authoritative

Decision: Protected route access must rely on server-side/middleware session validation, not only client-side UI state.

Reason: Prevents protected data/UI exposure and preserves secure App Router behavior.

## ADR-006 — Identity profiles are separate from Supabase Auth users

Decision: User identity/personalization data lives in an application profile table linked to the auth user id.

Reason: Future personalization and memory capabilities should not be coupled directly to the auth provider's user record.

## ADR-007 — Memory/timeline/capture tables are deferred

Decision: Do not introduce memory/timeline/capture tables until the product MVP stories require them.

Reason: Avoid premature schema complexity.

## ADR-008 — OpenAI/Qdrant/ZeroFlow are future integrations

Decision: Do not integrate OpenAI, Qdrant, or ZeroFlow until the related product or infrastructure task is explicitly scheduled.

Reason: Keep MVP foundation simple and avoid unused dependencies or operational complexity.

## ADR-009 — Centralized config is required

Decision: Environment access should flow through the centralized config/env layer.

Reason: Preserves public/server boundaries, validation, and deployment safety.

## ADR-010 — AI tools are implementation assistants, not merge authorities

Decision: Jules/Gemini/other AI tools may plan, implement, and review, but must not merge automatically.

Reason: Manual QA and owner approval remain required.
