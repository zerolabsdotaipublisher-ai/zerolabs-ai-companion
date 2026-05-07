# AI Companion

AI Companion MVP app built with Next.js.

This repository currently contains only the base Next.js application framework.
No Supabase, OpenAI, Qdrant, auth, payments, storage, or ZeroFlow integrations are included yet.

## Local development

See `/docs/local-development.md` for full setup instructions, including:

- Node.js LTS and npm requirements
- dependency installation
- environment setup from `.env.example`
- local run and validation commands

## Vercel deployment (build configuration)

Use the following Vercel project settings:

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave blank/default (Next.js-managed output)

`vercel.json` is not required for this repository at this stage because the default Next.js Vercel behavior matches MVP requirements.

## Environment variables

Create `.env.local` from `.env.example` and set values per environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

`.env.local` is Git-ignored and should never be committed. Keep `.env.example` as the committed template, and restart the dev server after env changes.

Do not commit real secrets. Configure production values in Vercel Project Settings → Environment Variables.
