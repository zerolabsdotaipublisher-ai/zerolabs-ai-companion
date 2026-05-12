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

## Environment validation behavior

Validation happens in `src/config/env.ts` using Zod schemas:

- Public variables are validated when the module is evaluated.
- Server variables are validated on the server runtime path only (`typeof window === "undefined"`).
- Invalid values (for example malformed URLs) throw an error like:
  - `Invalid public environment variables: ...`
  - `Invalid server environment variables: ...`
- Missing required values throw:
  - `Missing required environment variable: <NAME>. Set it in .env.local (local) or your deployment environment settings.`
- Accessing `serverConfig` from client code throws a server-only access error.

## Required environment variables

### Public (`publicConfig`)

- `NEXT_PUBLIC_APP_URL` (required URL)
- `NEXT_PUBLIC_SUPABASE_URL` (required URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)

### Server (`serverConfig`)

- `SUPABASE_SERVICE_ROLE_KEY` (required, secret)
- `OPENAI_API_KEY` (required, secret)

### Public optional with default

- `NEXT_PUBLIC_APP_NAME` (optional; defaults to `AI Companion`)

## Public vs server-only variables

Use this rule:

- `NEXT_PUBLIC_*` values can be exposed to browser/client bundles.
- Non-`NEXT_PUBLIC_*` values are server-only and must never be used in client components.

In this project:

- Public: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

Never put server secrets (for example `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) into client code.

## Local `.env.local` setup

1. Copy the template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill values in `.env.local` (no real secrets in committed files).
3. Restart the dev server after changes:

   ```bash
   npm run dev
   ```

Important:

- `.env.local` is ignored by git and must stay local.
- Do **not** commit `.env.local`.
- Keep `.env.example` as placeholder/template values only.

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
4. Redeploy so new values are applied to runtime/builds.

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

- `Invalid public environment variables: NEXT_PUBLIC_APP_URL ...`
  - Missing or invalid URL in public app URL.
- `Missing required environment variable: OPENAI_API_KEY ...`
  - Missing required server secret.
