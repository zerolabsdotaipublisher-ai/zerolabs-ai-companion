# Coding Standards

## Core rules

- Keep task scope narrow.
- Follow the Jira task exactly.
- Do not refactor unrelated code.
- Preserve existing architecture unless the task explicitly changes it.
- Keep changes reviewable and small.
- Add or update tests where behavior changes.
- Run lint/typecheck/tests/build when applicable.

## TypeScript

- Prefer explicit, safe typing.
- Avoid `any` unless there is a strong reason.
- Use type guards for untrusted runtime inputs.
- Treat URL/search/header values as untrusted.

## Authentication/security

- Server-side auth/session validation is authoritative.
- Do not introduce custom token storage.
- Do not expose service role keys to the client.
- Preserve safe redirect handling.
- Preserve same-origin/state-changing request protections.
- Do not widen trusted forwarded-origin behavior without explicit approval.

## Configuration

- Access environment variables through the centralized config layer.
- Keep public and server-only config boundaries separate.
- Do not read `process.env` throughout the app unless the config architecture explicitly allows it.

## UI

- Mobile-first.
- Low-friction.
- Minimal interaction.
- Avoid heavy forms unless required.
- Preserve accessibility-friendly validation/error states.

## Logging

- Use centralized logger utilities.
- Do not log secrets, cookies, auth tokens, sensitive payloads, or raw private user data.

## AI Context

When changing code, first identify the existing pattern and extend it. Do not introduce a second pattern for the same responsibility.
