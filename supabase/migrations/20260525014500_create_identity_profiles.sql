create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.identity_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  preferred_name text,
  timezone text,
  locale text,
  onboarding_status text not null default 'not_started',
  personalization jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  memory_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_profiles_onboarding_status_check check (
    onboarding_status in ('not_started', 'in_progress', 'completed')
  ),
  constraint identity_profiles_personalization_object_check check (
    jsonb_typeof(personalization) = 'object'
  ),
  constraint identity_profiles_preferences_object_check check (
    jsonb_typeof(preferences) = 'object'
  ),
  constraint identity_profiles_memory_settings_object_check check (
    jsonb_typeof(memory_settings) = 'object'
  )
);

create index identity_profiles_onboarding_status_idx
  on public.identity_profiles (onboarding_status);

create trigger set_identity_profiles_updated_at
before update on public.identity_profiles
for each row
execute function public.set_updated_at();

alter table public.identity_profiles enable row level security;

grant select, insert, update on table public.identity_profiles to authenticated;
grant select, insert, update on table public.identity_profiles to service_role;

create policy "Users can view their own identity profile"
on public.identity_profiles
for select
using (auth.uid() = user_id);

create policy "Users can insert their own identity profile"
on public.identity_profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own identity profile"
on public.identity_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
