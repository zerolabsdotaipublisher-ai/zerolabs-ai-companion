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

The bootstrap app has no required environment variables yet.

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run format:check
npm run lint
npm run build

# optional: fix formatting
npm run format
```

## MVP stack alignment

- Next.js (app framework)
- Product frontend/backend hosted on Vercel
- Source code in GitHub
- Product-specific app ownership

ZeroFlow and other platform integrations are intentionally deferred to later tasks.
