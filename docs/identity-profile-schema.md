# Identity Profile Schema (AIC-205)

## Purpose

`identity_profiles` is the application-level user profile table for AI Companion. It sits alongside Supabase Auth so the app can keep lightweight identity and personalization data without changing Supabase Auth internals.

This MVP schema is designed to support:

- basic user identity fields used across the product
- lightweight personalization and preferences for companion behavior
- future memory, suggestions, captures, and timeline features without introducing those tables yet

## Relationship to `auth.users`

- Each `identity_profiles.user_id` references `auth.users(id)`.
- The `user_id` column is unique, so each authenticated user can own at most one profile row.
- The foreign key uses `on delete cascade`, which keeps profile cleanup aligned with Supabase Auth user deletion.

## Table shape

The migration adds:

- identity fields: `display_name`, `preferred_name`
- regional defaults: `timezone`, `locale`
- onboarding state: `onboarding_status`
- flexible JSONB columns:
  - `personalization`
  - `preferences`
  - `memory_settings`
- timestamps: `created_at`, `updated_at`

`onboarding_status` is constrained to:

- `not_started`
- `in_progress`
- `completed`

The JSONB columns default to empty objects so the MVP can evolve without immediate schema churn, while still keeping profile data scoped to a single row per user.

## Migration dependency

- The `identity_profiles` table migration already exists from Task 5.1 in `supabase/migrations/20260525014500_create_identity_profiles.sql`.
- Task 5.2 signup/profile provisioning depends on that migration already being applied in the target Supabase database.
- This PR does not add a duplicate profile-table migration because the schema is inherited from Task 5.1.
- If a Preview or local Supabase database does not have that migration applied, signup will fail safely, log a migration/setup diagnostic, and attempt auth-user rollback to avoid intentional orphaned users.

## Access model

Row Level Security is enabled on `identity_profiles`.

- authenticated users can `select` only their own row
- authenticated users can `insert` only their own row
- authenticated users can `update` only their own row
- no self-service delete policy is added for the MVP

An `updated_at` trigger keeps row timestamps current on every update.

## Signup profile creation workflow

- Registration still creates the Supabase Auth user through the existing server-side signup route.
- After Auth signup succeeds, the app creates the matching `identity_profiles` row with the same `user_id`.
- Safe defaults are inserted for the MVP profile fields, relying on table defaults where appropriate.
- If profile creation fails after Auth signup, the server attempts a service-role rollback by deleting the newly created auth user so orphaned auth users are not intentionally left behind.
- Duplicate profile creation is avoided by checking for an existing row and respecting the unique `user_id` constraint.
- No secrets, service-role values, or raw Supabase errors should be exposed to the user-facing response path.

## Preview/manual validation setup

Before manual signup validation against a Preview Supabase database:

1. Apply the Task 5.1 migration file `supabase/migrations/20260525014500_create_identity_profiles.sql` to that database.
2. Confirm `public.identity_profiles` exists before testing `/auth/signup`.
3. Then run the signup flow and verify both the auth user and matching profile row are created.

If the table is missing, server logs should point to the missing migration dependency while the user still receives a generic signup failure message.

## Intended JSONB usage

- `personalization`: profile-level traits that influence AI behavior, tone, or defaults
- `preferences`: lightweight product settings such as toggles and presentation choices
- `memory_settings`: early per-user controls for future memory capture and recall behavior

These fields are intentionally broad for the MVP so product work can iterate before locking in deeper relational models.

## Why full memory tables are deferred

Long-term memory, timeline, capture, journal, relationship, and suggestion tables are deferred to later tasks. Those features need clearer product rules, retention decisions, and query patterns than the current MVP requires.

For now, `identity_profiles` provides a stable user-owned anchor row that future memory-oriented features can reference.
