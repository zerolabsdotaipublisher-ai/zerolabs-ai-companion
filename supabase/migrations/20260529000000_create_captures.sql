create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suggestion_id uuid references public.daily_suggestions(id) on delete set null,
  note_text text,
  media_metadata jsonb default null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index captures_user_id_created_at_idx
  on public.captures (user_id, created_at desc);

create index captures_suggestion_id_idx
  on public.captures (suggestion_id)
  where suggestion_id is not null;

alter table public.captures enable row level security;

create policy "Users can view their own captures"
on public.captures
for select
using (auth.uid() = user_id);

create policy "Users can insert their own captures"
on public.captures
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own captures"
on public.captures
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own captures"
on public.captures
for delete
using (auth.uid() = user_id);
