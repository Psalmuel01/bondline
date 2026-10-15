-- Durable encrypted CRE login state for hosts whose local filesystem resets.
-- The settlement key is NOT stored here. No browser roles may read this table.
create table if not exists public.verification_runtime_sessions (
  chain_id integer not null check (chain_id=10143),
  core_address text not null,
  ciphertext text not null check (length(ciphertext)<=24576),
  updated_at timestamptz not null default now(),
  primary key (chain_id,core_address)
);
alter table public.verification_runtime_sessions enable row level security;
revoke all on public.verification_runtime_sessions from public,anon,authenticated;
grant select,insert,update on public.verification_runtime_sessions to service_role;
