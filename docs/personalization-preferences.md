# Personalization Preferences (AIC-205 Task 5.4)

## Storage

AI Companion personalization preferences are stored in `public.identity_profiles.preferences` under the `companion_preferences` JSON object.

This keeps Supabase Postgres as the MVP source of truth without introducing Qdrant, OpenAI calls, ZeroFlow orchestration, background jobs, or separate memory services.

## Default values

When a user has no saved companion preferences yet, the app uses these defaults:

- `companion_tone`: `calm`
- `suggestion_style`: `balanced`
- `activity_intensity`: `light`
- `preferred_time_of_day`: `anytime`
- `location_preference`: `nearby`
- `interests`: `[]`
- `avoidances`: `[]`
- `ai_context`: `{}`

## Retrieval behavior

- `getCompanionPreferencesForUser(userId)` returns normalized defaults when the profile row exists but the nested preference object is missing.
- `ensureCompanionPreferencesForUser(userId)` creates the missing `identity_profiles` row with default companion preferences when needed.
- `updateCompanionPreferencesForUser(userId, input)` only accepts allowed fields, validates enum values, sanitizes list inputs, and always uses the authenticated server user instead of client-supplied user ids.

## Future AI context usage

Use `buildCompanionPreferenceContext(preferences)` when assembling future prompt/context payloads.

That helper intentionally returns only the small structured companion preference context needed for prompt assembly:

- tone
- suggestion style
- activity intensity
- preferred time of day
- location preference
- interests
- avoidances

Do not include auth tokens, emails, raw profile data, or other sensitive user information in AI prompt context from this helper.
