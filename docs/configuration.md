# Configuration

Environment variables are centralized in:

- `src/config/env.ts`

Use exported config objects instead of reading `process.env` directly:

- `publicConfig` for browser-safe values (`NEXT_PUBLIC_*`)
- `serverConfig` for server-only secrets

Helpers:

- `required(name)` for required variables (throws in local development when missing)
- `optional(name)` for optional variables (`undefined` when missing)

## Required variables

### Public (`publicConfig`)

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server (`serverConfig`)

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## Optional future variables (`serverConfig`)

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `ZERO_FLOW_API_URL`
- `ZERO_FLOW_API_KEY`

## Local development

1. Copy template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in `.env.local` with local values.
3. Restart `npm run dev` after changes.

Notes:

- `.env.local` is gitignored and must not be committed.
- Keep `.env.example` as placeholders only.

## Vercel

1. Open your project in Vercel.
2. Go to **Settings → Environment Variables**.
3. Add the same required keys for each target environment (Development/Preview/Production).
4. Redeploy so new variables are applied.

Only set server secrets (for example `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in Vercel server environments. Do not expose them in client code.
