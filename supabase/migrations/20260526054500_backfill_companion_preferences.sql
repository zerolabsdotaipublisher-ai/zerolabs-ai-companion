update public.identity_profiles
set preferences = jsonb_set(
  case
    when jsonb_typeof(preferences) = 'object' then preferences
    else '{}'::jsonb
  end,
  '{companion_preferences}',
  jsonb_build_object(
    'companion_tone',
    case
      when coalesce(preferences->'companion_preferences'->>'companion_tone', '') in ('calm', 'friendly', 'playful', 'direct')
        then preferences->'companion_preferences'->>'companion_tone'
      else 'calm'
    end,
    'suggestion_style',
    case
      when coalesce(preferences->'companion_preferences'->>'suggestion_style', '') in ('balanced', 'novel', 'familiar', 'outdoor', 'indoor')
        then preferences->'companion_preferences'->>'suggestion_style'
      else 'balanced'
    end,
    'activity_intensity',
    case
      when coalesce(preferences->'companion_preferences'->>'activity_intensity', '') in ('light', 'moderate', 'active')
        then preferences->'companion_preferences'->>'activity_intensity'
      else 'light'
    end,
    'preferred_time_of_day',
    case
      when coalesce(preferences->'companion_preferences'->>'preferred_time_of_day', '') in ('morning', 'afternoon', 'evening', 'anytime')
        then preferences->'companion_preferences'->>'preferred_time_of_day'
      else 'anytime'
    end,
    'location_preference',
    case
      when coalesce(preferences->'companion_preferences'->>'location_preference', '') in ('nearby', 'local_area', 'anywhere')
        then preferences->'companion_preferences'->>'location_preference'
      else 'nearby'
    end,
    'interests',
    case
      when jsonb_typeof(coalesce(preferences->'companion_preferences'->'interests', '[]'::jsonb)) = 'array'
        then coalesce(preferences->'companion_preferences'->'interests', '[]'::jsonb)
      else '[]'::jsonb
    end,
    'avoidances',
    case
      when jsonb_typeof(coalesce(preferences->'companion_preferences'->'avoidances', '[]'::jsonb)) = 'array'
        then coalesce(preferences->'companion_preferences'->'avoidances', '[]'::jsonb)
      else '[]'::jsonb
    end,
    'ai_context',
    case
      when jsonb_typeof(coalesce(preferences->'companion_preferences'->'ai_context', '{}'::jsonb)) = 'object'
        then coalesce(preferences->'companion_preferences'->'ai_context', '{}'::jsonb)
      else '{}'::jsonb
    end
  ),
  true
);

alter table public.identity_profiles
add constraint identity_profiles_companion_preferences_object_check check (
  not (preferences ? 'companion_preferences')
  or jsonb_typeof(preferences->'companion_preferences') = 'object'
);

alter table public.identity_profiles
add constraint identity_profiles_companion_tone_check check (
  coalesce(preferences->'companion_preferences'->>'companion_tone', 'calm')
    in ('calm', 'friendly', 'playful', 'direct')
);

alter table public.identity_profiles
add constraint identity_profiles_suggestion_style_check check (
  coalesce(preferences->'companion_preferences'->>'suggestion_style', 'balanced')
    in ('balanced', 'novel', 'familiar', 'outdoor', 'indoor')
);

alter table public.identity_profiles
add constraint identity_profiles_activity_intensity_check check (
  coalesce(preferences->'companion_preferences'->>'activity_intensity', 'light')
    in ('light', 'moderate', 'active')
);

alter table public.identity_profiles
add constraint identity_profiles_preferred_time_of_day_check check (
  coalesce(preferences->'companion_preferences'->>'preferred_time_of_day', 'anytime')
    in ('morning', 'afternoon', 'evening', 'anytime')
);

alter table public.identity_profiles
add constraint identity_profiles_location_preference_check check (
  coalesce(preferences->'companion_preferences'->>'location_preference', 'nearby')
    in ('nearby', 'local_area', 'anywhere')
);

alter table public.identity_profiles
add constraint identity_profiles_companion_interests_array_check check (
  jsonb_typeof(coalesce(preferences->'companion_preferences'->'interests', '[]'::jsonb)) = 'array'
);

alter table public.identity_profiles
add constraint identity_profiles_companion_avoidances_array_check check (
  jsonb_typeof(coalesce(preferences->'companion_preferences'->'avoidances', '[]'::jsonb)) = 'array'
);

alter table public.identity_profiles
add constraint identity_profiles_companion_ai_context_object_check check (
  jsonb_typeof(coalesce(preferences->'companion_preferences'->'ai_context', '{}'::jsonb)) = 'object'
);
