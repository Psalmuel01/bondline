-- Run once after deploying the wallet-authenticated /api/circles/:address/messages route.
-- Existing messages are preserved. This only closes direct anonymous access.

alter table public.circle_messages enable row level security;

drop policy if exists "public Circle chat read" on public.circle_messages;
drop policy if exists "public Circle chat send" on public.circle_messages;

-- Intentionally create no replacement client policy. The server uses the
-- Supabase service role after verifying a signed wallet session and current
-- on-chain Circle membership. Service-role requests bypass RLS.

comment on table public.circle_messages is
  'Private Circle chat. Access only through Bondline wallet-authenticated server routes.';
