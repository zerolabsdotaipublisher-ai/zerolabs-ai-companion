# Local Development

## Prerequisites

- Node.js LTS (use `lts/*`, currently validated on Node `v20.20.2`)
- npm (validated on npm `10.8.2`)

## Clone

```bash
git clone https://github.com/zerolabsdotaipublisher-ai/zerolabs-ai-companion.git
cd zerolabs-ai-companion
```

## Install dependencies

```bash
npm install
```

## Environment setup

```bash
cp .env.example .env.local
```

Fill `.env.local` with local/dev values for required variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional Sentry values:

- `NEXT_PUBLIC_SENTRY_DSN` (runtime error capture)
- `SENTRY_AUTH_TOKEN` (source map upload during build)
- `SENTRY_ORG` (source map upload metadata)
- `SENTRY_PROJECT` (source map upload metadata)

Notes:

- `.env.local` is ignored by Git via `.gitignore` and must never be committed
- keep `.env.example` committed as the template
- restart `npm run dev` after changing environment variables
- required local env keys are checked on `npm run dev` startup

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run format:check
npm run typecheck
npm run lint
npm run build

# optional: fix formatting
npm run format
```

## Manual Sentry verification

When `NEXT_PUBLIC_SENTRY_DSN` is configured, trigger a controlled test error:

```bash
curl -i -X POST http://localhost:3000/api/monitoring/sentry-test \
  -H "x-sentry-test: true"
```

Expected behavior:

- request without `x-sentry-test: true` returns `400`
- request with the header returns `500` and the error is sent to Sentry

## MVP stack alignment

- Next.js (app framework)
- Product frontend/backend hosted on Vercel
- Source code in GitHub
- Product-specific app ownership

ZeroFlow and other platform integrations are intentionally deferred to later tasks.
