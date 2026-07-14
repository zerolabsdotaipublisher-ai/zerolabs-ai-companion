# Technology Stack

## Current stack

- Framework: Next.js App Router
- Language: TypeScript
- UI: React + Tailwind CSS
- Deployment: Vercel
- Auth: Supabase Auth
- Database: Supabase Postgres
- Config validation: Zod-based centralized environment/config layer
- Logging: Centralized application logger
- Monitoring: Lightweight logger-based performance/error monitoring foundation; optional Sentry-ready support
- Testing/quality: lint, typecheck, tests, build, CodeQL/security review

## Current provider decisions

- Supabase handles authentication and primary structured data.
- Vercel handles hosting and preview/production deployment.
- OpenAI is planned for future AI suggestion and memory generation, but not active yet.
- Qdrant is optional/future for semantic memory.
- ZeroFlow is future orchestration/cost tracking, not current product dependency.

## Environment principles

- No real secrets in Git.
- `.env.example` contains placeholders only.
- `.env.local` is local-only and ignored.
- Public variables must use `NEXT_PUBLIC_` only when safe for the browser.
- Server secrets must never be imported into client components.

## Future stack direction

MVP future:

- OpenAI API for suggestions and one-line memory generation
- Supabase Storage for simple media/capture uploads if needed

Scale future:

- Wasabi for cost-effective media storage
- Qdrant for semantic memory retrieval
- ZeroFlow for AI orchestration, usage ledger, and cost tracking
- Potential mobile app layer later

## AI Context

Do not add new external services without an explicit Jira story and architectural approval.
