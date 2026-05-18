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

For auth-specific validation and smoke checks, see `/docs/auth-validation.md`.

## MVP stack alignment

- Next.js (app framework)
- Product frontend/backend hosted on Vercel
- Source code in GitHub
- Product-specific app ownership

ZeroFlow and other platform integrations are intentionally deferred to later tasks.
