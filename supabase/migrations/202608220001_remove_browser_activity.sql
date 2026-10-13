-- Chain activity is canonical data from the finalized-event indexer. Remove
-- the legacy browser-authored table and anonymous write path so Circle history
-- cannot be forged with the public Supabase anon key.

drop policy if exists "public Circle activity read" on public.circle_activity;
drop policy if exists "public Circle activity write" on public.circle_activity;
drop table if exists public.circle_activity;
