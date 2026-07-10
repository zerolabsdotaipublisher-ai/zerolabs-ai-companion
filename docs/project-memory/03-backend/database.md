# Database

## Purpose

This file documents the current database state and planned database direction.

## Current database provider

AI Companion uses Supabase Postgres for primary structured data.

## Current implemented schema area

### `identity_profiles`

The identity profile system is linked to Supabase Auth users and stores user identity/personalization data.

Implemented capabilities:

- Profile row linked to auth user id
- Per-user access through RLS policies
- Personalization/preference fields
- Memory-compatible JSONB fields
- Profile creation during signup
- Profile read/update through authenticated user context

## Current important behavior

- Signup creates the Supabase Auth user first.
- Signup then provisions the matching identity profile row.
- Duplicate profile creation is avoided.
- Rollback/orphan-prevention behavior exists if profile provisioning fails after auth signup.
- Profile updates must be authenticated and user-scoped.

## Deferred MVP tables

The following are planned but not yet implemented:

- `daily_suggestions`
- `user_actions`
- `captures`
- `memories`
- timeline-related tables
- semantic memory/vector references

## Future database direction

MVP future:

- Keep schemas simple.
- Store daily suggestions, actions, captures, and one-line memories.
- Avoid complex trips/journals/life graph tables early.

Scale future:

- Experience grouping
- Pattern recognition data
- Semantic memory references
- Analytics/retention events
- Storage metadata for media

## AI Context

Do not add future memory/timeline/capture tables unless the Jira task explicitly introduces them. Do not weaken RLS policies. Do not bypass authenticated user ownership checks.
