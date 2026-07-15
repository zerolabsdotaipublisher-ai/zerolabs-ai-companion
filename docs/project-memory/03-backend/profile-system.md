# Profile System

## Purpose

This file documents the identity profile and personalization system created in AIC-205.

## Current state

AI Companion has an implemented identity profile system linked to Supabase Auth users.

Implemented:

- Identity profile schema
- RLS per-user access
- Automatic profile creation during signup
- Orphan-prevention/rollback handling
- Protected `/profile` page
- Editable profile and personalization fields
- Preference default loading
- Preference persistence and reload
- Dark UI dropdown readability fix
- Tests for profile/preference behavior

## Schema Extensions (Task 7.2 & AIC-207)

The `identity_profiles` table stores user-specific data.

### Preferences JSONB

The `preferences` JSONB schema has been extended to store the updated onboarding payload via the Supabase client safely merging updates:

- `onboarding_completed` (boolean): Flag used to track the initialization state of a user profile after they have completed the initial onboarding journey.
- `companion_vibe` (string): The selected companion temperament (e.g., "Spontaneous", "Reflective", "Creative").

_Note: Automatic detection of the `onboarding_completed` flag and subsequent redirects or complete route guarding are deferred to Task 7.3._

## Profile lifecycle

```text
User signs up
→ Supabase Auth user is created
→ identity profile is provisioned
→ User logs in
→ User accesses /profile
→ User updates identity/preferences
→ Changes persist and reload
```

## Personalization preferences

Personalization preferences are stored under the identity profile preference structure.

Current behavior:

- Defaults are provided when preferences are missing.
- Preferences can be updated through authenticated profile UI.
- Omitted preference fields are preserved.
- Normalization is stable and not locale-dependent.
- Preference context builder is prepared for future AI prompt/context use.

## Future profile direction

Future additions may include:

- More companion preference controls
- Suggestion personalization
- Memory context preferences
- Privacy controls
- Export controls

## AI Context

Do not decouple identity profile ownership from Supabase Auth user id. Do not add memory, timeline, or AI prompt behavior directly into profile UI unless explicitly required.
