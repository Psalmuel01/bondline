-- Bondline social layer (testnet prototype). Run in the Supabase SQL editor.
-- The client uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
create table if not exists public.profiles (
  address text primary key check (address ~ '^0x[0-9a-f]{40}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  circle_address text not null check (circle_address ~ '^0x[0-9a-f]{40}$'),
  sender_address text not null check (sender_address ~ '^0x[0-9a-f]{40}$'),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists circle_messages_circle_created_at on public.circle_messages (circle_address, created_at desc);

alter table public.profiles enable row level security;
alter table public.circle_messages enable row level security;

-- This is intentionally permissive for a testnet demo with an anon key.
-- Before mainnet, replace the insert policies with wallet-signature verification
-- in a Supabase Edge Function and check on-chain Circle membership there.
create policy "public profile read" on public.profiles for select using (true);
create policy "public profile upsert" on public.profiles for insert with check (true);
create policy "public profile update" on public.profiles for update using (true) with check (true);
create policy "public Circle chat read" on public.circle_messages for select using (true);
create policy "public Circle chat send" on public.circle_messages for insert with check (true);

alter table public.circle_messages replica identity full;
alter publication supabase_realtime add table public.circle_messages;
