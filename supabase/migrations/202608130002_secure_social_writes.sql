-- Run after deploying the wallet-authenticated profile, metadata, and media routes.
-- Public reads remain available; direct browser mutations are closed.

drop policy if exists "public profile upsert" on public.profiles;
drop policy if exists "public profile update" on public.profiles;

drop policy if exists "public Circle metadata write" on public.circle_metadata;
drop policy if exists "public Circle metadata update" on public.circle_metadata;

drop policy if exists "public Circle media upload" on storage.objects;
drop policy if exists "public Circle media delete" on storage.objects;

comment on table public.profiles is
  'Public profile display data. Mutations require a wallet-authenticated owner route.';
comment on table public.circle_metadata is
  'Public Circle display data. Mutations require a wallet-authenticated member route.';
