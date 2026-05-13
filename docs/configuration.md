# Configuration

## Purpose of the config layer

The application configuration layer centralizes all environment variable access in:

- `src/config/env.ts`

This provides:

- one place to validate environment variables
- a clear public/server boundary
- consistent runtime errors when values are missing or invalid

## Why `process.env` should not be used directly

Do not read `process.env` directly outside `src/config/env.ts`.

Direct usage scatters configuration logic, skips shared validation, and can accidentally expose server secrets to client code. Instead, import from the config layer:

- `publicConfig` for browser-safe values (`NEXT_PUBLIC_*`)
- `serverConfig` for server-only values

For existing public-only alias usage, `src/lib/env.ts` re-exports `publicConfig` as `env`.

Exception:

- Next.js/Sentry bootstrap files (`next.config.ts`, `instrumentation*.ts`, `sentry.*.config.ts`) may read `process.env` directly because they run before app module config access patterns apply.

## Environment validation behavior

Validation happens in `src/config/env.ts` using Zod schemas:

- Public variables are validated when the module is evaluated.
- Server variables are validated on the server runtime path only (`typeof window === "undefined"`).
- Validation failures throw:
  - `Invalid public environment variables: <KEY>: <reason>; ... Define values in .env.local for local development and configure deployment/Vercel environment variables for CI and deployment.`
  - `Invalid server environment variables: <KEY>: <reason>; ... Define values in .env.local for local development and configure deployment/Vercel environment variables for CI and deployment.`
- For required lookups via `required(...)` / `requiredPublic(...)`, missing values throw:
  - `Missing required environment variable: <NAME>. Set it in .env.local (local) or your deployment environment settings.`
- Accessing `serverConfig` from client code throws a server-only access error.

## Required environment variables

### Public (`publicConfig`)

- `NEXT_PUBLIC_APP_URL` (required URL)
- `NEXT_PUBLIC_SUPABASE_URL` (required URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `NEXT_PUBLIC_SENTRY_DSN` (optional; public DSN for runtime error tracking)

### Server (`serverConfig`)

- `SUPABASE_SERVICE_ROLE_KEY` (required, secret)
- `OPENAI_API_KEY` (required, secret)
- `QDRANT_URL` (optional URL; future vector DB integration)
- `QDRANT_API_KEY` (optional; future vector DB integration)
- `QDRANT_COLLECTION` (optional; future vector DB integration)
- `ZERO_FLOW_API_URL` (optional URL; future platform integration)
- `ZERO_FLOW_API_KEY` (optional; future platform integration)

### Build-time server-only (Sentry source maps)

- `SENTRY_AUTH_TOKEN` (optional, secret; required only if uploading source maps)
- `SENTRY_ORG` (optional; used with source map upload)
- `SENTRY_PROJECT` (optional; used with source map upload)

### Public optional with default

- `NEXT_PUBLIC_APP_NAME` (optional; defaults to `AI Companion`)

### Other template variables in `.env.example`

- `NODE_ENV` (template/runtime environment label; not validated by `src/config/env.ts`)

## Public vs server-only variables

Use this rule:

- `NEXT_PUBLIC_*` values can be exposed to browser/client bundles.
- Non-`NEXT_PUBLIC_*` values are server-only and must never be used in client components.

In this project:

- Public: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`, `ZERO_FLOW_API_URL`, `ZERO_FLOW_API_KEY`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

Never put server secrets (for example `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) into client code.

## Local `.env.local` setup

1. Copy the template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill values in `.env.local` (this is where real local secrets belong).
3. Restart the dev server after changes:

   ```bash
   npm run dev
   ```

Important:

- `.env.local` is ignored by git and must stay local.
- Do **not** commit `.env.local`.
- `.env.example` must contain placeholders/template values only (never real credentials).

## Vercel environment setup

1. Open project in Vercel.
2. Go to **Settings → Environment Variables**.
3. Add required variables for each environment (Development, Preview, Production):
    - `NEXT_PUBLIC_APP_NAME` (optional)
    - `NEXT_PUBLIC_APP_URL`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `OPENAI_API_KEY`
    - `NEXT_PUBLIC_SENTRY_DSN` (optional)
    - `QDRANT_URL` (optional)
    - `QDRANT_API_KEY` (optional)
    - `QDRANT_COLLECTION` (optional)
    - `ZERO_FLOW_API_URL` (optional)
    - `ZERO_FLOW_API_KEY` (optional)
    - `SENTRY_AUTH_TOKEN` (optional, set in environments where source map upload is desired)
    - `SENTRY_ORG` (optional, required with `SENTRY_AUTH_TOKEN`)
    - `SENTRY_PROJECT` (optional, required with `SENTRY_AUTH_TOKEN`)
4. Redeploy so new values are applied to runtime/builds.

## Sentry runtime error tracking

Sentry is configured for Next.js runtime capture across:

- Client runtime (`instrumentation-client.ts`)
- Server runtime (`sentry.server.config.ts`)
- Edge runtime (`sentry.edge.config.ts`)
- App Router global error boundary (`src/app/global-error.tsx`)

Sentry complements the centralized structured logger (`src/lib/logger.ts`); it does not replace logging.

### Source map upload behavior

Source map upload is enabled only when `SENTRY_AUTH_TOKEN` is present. If the token is missing, upload is skipped during build.

### Manual verification path (production-safe)

Use the protected test endpoint:

```bash
curl -i -X POST https://<your-domain>/api/monitoring/sentry-test \
  -H "x-sentry-test: true"
```

Behavior:

- Without header `x-sentry-test: true`, endpoint returns HTTP 400 and does not throw.
- With the header, endpoint intentionally throws, logs via `logger.error(...)`, and sends the exception to Sentry.

After triggering:

1. Open **Sentry → Issues** for the configured project.
2. Confirm a new issue containing `Intentional Sentry test error` appears.
3. Validate stack trace and release/source context (if source maps were uploaded).

### Alert configuration in Sentry

Configure alerts in Sentry project settings:

1. Go to **Alerts → Create Alert Rule**.
2. Create an issue alert for `The event's level is error` and `Issue is new`.
3. Route notifications to your team channel/email/on-call target.
4. Optionally add environment filters (for example `production`) to reduce noise.
5. Test the alert by triggering the verification endpoint and confirm notification delivery.

## Example config usage

Public usage:

```ts
import { publicConfig } from "@/config/env";

const appName = publicConfig.appName;
const appUrl = publicConfig.appUrl;
```

Server usage:

```ts
import { serverConfig } from "@/config/env";

const serviceRoleKey = serverConfig.supabaseServiceRoleKey;
const openaiApiKey = serverConfig.openaiApiKey;
```

Avoid this outside `src/config/env.ts`:

```ts
process.env.MY_VARIABLE;
```

## How to safely add new environment variables

1. Decide whether the variable is public (`NEXT_PUBLIC_*`) or server-only.
2. Add it to the matching type and Zod schema in `src/config/env.ts`.
3. Map it from `process.env` in the same file.
4. Expose it via `publicConfig` or `serverConfig` with the correct required/optional behavior.
5. Add placeholder entries to `.env.example`.
6. Update docs (`docs/configuration.md` and related setup docs if needed).
7. Validate locally (`npm run lint`, `npm run build`).

## Troubleshooting invalid/missing environment variables

If startup or build fails with config errors:

1. Read the error name and variable key in the message.
2. Confirm the variable exists in `.env.local` (local) or Vercel settings (deployed).
3. For URL variables, ensure the value is a full valid URL (`https://...`).
4. Ensure server-only keys are not being accessed in client code.
5. Restart local dev/build after changing env values.

Common issue examples:

- `Invalid public environment variables: NEXT_PUBLIC_APP_URL: is required; ... Define values in .env.local for local development and configure deployment/Vercel environment variables for CI and deployment.`
  - Required public value is missing.
- `Invalid server environment variables: OPENAI_API_KEY: is required; ... Define values in .env.local for local development and configure deployment/Vercel environment variables for CI and deployment.`
  - Required server secret is missing.
