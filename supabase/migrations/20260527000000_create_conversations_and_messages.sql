create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (
    role in ('user', 'assistant', 'system')
  )
);

create index conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at desc);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

create index messages_user_id_idx
  on public.messages (user_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can view their own conversations"
on public.conversations
for select
using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
on public.conversations
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
on public.conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own conversations"
on public.conversations
for delete
using (auth.uid() = user_id);


create policy "Users can view their own messages"
on public.messages
for select
using (auth.uid() = user_id);

create policy "Users can insert their own messages"
on public.messages
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own messages"
on public.messages
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own messages"
on public.messages
for delete
using (auth.uid() = user_id);
