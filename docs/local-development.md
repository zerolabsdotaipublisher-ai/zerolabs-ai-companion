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

Fill `.env.local` with real values for:
- Supabase Auth / Postgres / Storage
- OpenAI API
- Qdrant
- `ZEROFLOW_BASE_URL` (placeholder only for future compatibility)

## Run locally
```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality checks
```bash
npm run lint
npm run build
```

## MVP stack alignment
- Next.js (app framework)
- Vercel (deployment target)
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI API
- Qdrant

ZeroFlow integration is intentionally left as future-compatible placeholders only in this setup task.
