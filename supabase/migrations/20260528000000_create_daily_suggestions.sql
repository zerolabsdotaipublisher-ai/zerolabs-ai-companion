create table public.daily_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary_suggestion text not null,
  supporting_context text not null,
  alternatives jsonb default '[]'::jsonb,
  estimated_duration text,
  category_tags jsonb default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint daily_suggestions_status_check check (
    status in ('pending', 'accepted', 'skipped', 'alternative_requested')
  )
);

create trigger set_daily_suggestions_updated_at
before update on public.daily_suggestions
for each row
execute function public.set_updated_at();

create index daily_suggestions_user_id_created_at_idx
  on public.daily_suggestions (user_id, created_at desc);

create index daily_suggestions_user_id_status_idx
  on public.daily_suggestions (user_id, status);

alter table public.daily_suggestions enable row level security;

create policy "Users can view their own daily suggestions"
on public.daily_suggestions
for select
using (auth.uid() = user_id);

create policy "Users can insert their own daily suggestions"
on public.daily_suggestions
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own daily suggestions"
on public.daily_suggestions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own daily suggestions"
on public.daily_suggestions
for delete
using (auth.uid() = user_id);
