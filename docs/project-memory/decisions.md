# Decisions

This document summarizes major architectural and workflow decisions.

## Deployment Strategy

- The product frontend and backend will be hosted on **Vercel**.
- Vercel settings will rely on the default Next.js build output behavior. A custom `vercel.json` is not required for the MVP.

## Scope Management (MVP)

- The project starts as a base Next.js application framework.
- Integrations with ZeroFlow, Supabase, OpenAI, Qdrant, auth, payments, and storage are **intentionally deferred** to later tasks.

## Development Workflow

- Development is strictly **Jira-driven**.
- **Manual QA** and human reviews are mandated prior to merging. AI tools (e.g., Jules) can assist and generate PRs but must not merge code.
