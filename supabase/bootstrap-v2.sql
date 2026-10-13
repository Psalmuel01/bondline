-- Bondline v2 bootstrap for a NEW / dedicated Monad testnet Supabase project.
-- Run this entire file in Supabase SQL Editor as the project administrator.
-- Preserves existing v1 databases by refusing a mismatched deployment cursor.
-- Built from schema.sql followed by every migration in filename order.
begin;
do $$
declare conflict_exists boolean;
begin
  if to_regclass('public.chain_sync_state') is not null then
    execute 'select exists(select 1 from public.chain_sync_state where chain_id <> 10143 or deployment_block <> 70697469)' into conflict_exists;
    if conflict_exists then
      raise exception 'This database belongs to a different Bondline deployment. Run this bootstrap in a dedicated v2 Supabase project; keep the original database intact.';
    end if;
  end if;
end $$;


-- Source: supabase/schema.sql
-- Bondline social layer (testnet prototype). Run in the Supabase SQL editor.
-- The client uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
create table if not exists public.profiles (
  address text primary key check (address ~ '^0x[0-9a-f]{40}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  avatar_color text not null default '#514332' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);
-- Safe when upgrading from the earlier name-only profile schema.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_color text not null default '#514332';

create table if not exists public.circle_metadata (
  circle_address text primary key check (circle_address ~ '^0x[0-9a-f]{40}$'),
  mission text check (mission is null or char_length(mission) <= 120),
  pot_goal numeric check (pot_goal is null or pot_goal > 0),
  banner_url text check (banner_url is null or char_length(banner_url) <= 2048),
  updated_at timestamptz not null default now()
);

-- Legacy compatibility only. This table intentionally has no browser policy;
-- finalized chain_events become the sole activity source after migrations run.
-- Keeping the definition here lets the historical snapshot migration apply
-- cleanly before 202608220001_remove_browser_activity.sql drops it.
create table if not exists public.circle_activity (
  id uuid primary key default gen_random_uuid(),
  circle_address text not null check (circle_address ~ '^0x[0-9a-f]{40}$'),
  actor_address text check (actor_address is null or actor_address ~ '^0x[0-9a-f]{40}$'),
  kind text not null check (kind in ('bond_opened', 'bond_declared', 'bond_met', 'bond_crossed', 'cosigned', 'payout_proposed', 'payout_paid')),
  body text not null check (char_length(body) between 1 and 280),
  tx_hash text check (tx_hash is null or tx_hash ~ '^0x[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists circle_activity_circle_created_at on public.circle_activity (circle_address, created_at desc);

create table if not exists public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  circle_address text not null check (circle_address ~ '^0x[0-9a-f]{40}$'),
  sender_address text not null check (sender_address ~ '^0x[0-9a-f]{40}$'),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists circle_messages_circle_created_at on public.circle_messages (circle_address, created_at desc);

-- Public display media for profile avatars and Circle banners. The app stores
-- the resulting public URL in profiles.avatar_url / circle_metadata.banner_url.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circle-media', 'circle-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

alter table public.profiles enable row level security;
alter table public.circle_messages enable row level security;
alter table public.circle_metadata enable row level security;
alter table public.circle_activity enable row level security;

-- Public identity metadata remains readable. Private Circle chat has no anon or
-- authenticated PostgREST policy: it is accessed only through Bondline's
-- wallet-authenticated server route, whose service role verifies membership.
drop policy if exists "public profile read" on public.profiles;
drop policy if exists "public profile upsert" on public.profiles;
drop policy if exists "public profile update" on public.profiles;
drop policy if exists "public Circle chat read" on public.circle_messages;
drop policy if exists "public Circle chat send" on public.circle_messages;
drop policy if exists "public Circle metadata read" on public.circle_metadata;
drop policy if exists "public Circle metadata write" on public.circle_metadata;
drop policy if exists "public Circle metadata update" on public.circle_metadata;
drop policy if exists "public Circle activity read" on public.circle_activity;
drop policy if exists "public Circle activity write" on public.circle_activity;
create policy "public profile read" on public.profiles for select using (true);
create policy "public Circle metadata read" on public.circle_metadata for select using (true);

drop policy if exists "public Circle media read" on storage.objects;
drop policy if exists "public Circle media upload" on storage.objects;
drop policy if exists "public Circle media delete" on storage.objects;
create policy "public Circle media read" on storage.objects for select using (bucket_id = 'circle-media');

alter table public.circle_messages replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'circle_messages'
  ) then
    alter publication supabase_realtime add table public.circle_messages;
  end if;
end $$;


-- Source: supabase/migrations/202608130001_secure_circle_chat.sql
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


-- Source: supabase/migrations/202608130002_secure_social_writes.sql
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


-- Source: supabase/migrations/202608130003_indexed_circle_snapshots.sql
-- Canonical, idempotent projections populated by the Bondline event indexer.
-- This migration does not alter the current frontend read path. Switch reads
-- only after backfill and reconciliation have completed successfully.

create table if not exists public.chain_events (
  chain_id bigint not null,
  tx_hash text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null,
  block_number bigint not null,
  block_hash text not null check (block_hash ~ '^0x[0-9a-f]{64}$'),
  contract_address text not null check (contract_address ~ '^0x[0-9a-f]{40}$'),
  event_name text not null,
  circle_address text check (circle_address is null or circle_address ~ '^0x[0-9a-f]{40}$'),
  actor_address text check (actor_address is null or actor_address ~ '^0x[0-9a-f]{40}$'),
  bond_id numeric,
  payout_id numeric,
  payload jsonb not null default '{}'::jsonb,
  block_timestamp timestamptz not null,
  primary key (chain_id, tx_hash, log_index)
);
create index if not exists chain_events_circle_block on public.chain_events (circle_address, block_number desc, log_index desc);

create table if not exists public.chain_sync_state (
  chain_id bigint primary key,
  deployment_block bigint not null,
  last_finalized_block bigint not null,
  last_finalized_hash text,
  updated_at timestamptz not null default now()
);

create table if not exists public.indexed_circles (
  circle_address text primary key check (circle_address ~ '^0x[0-9a-f]{40}$'),
  creator_address text not null check (creator_address ~ '^0x[0-9a-f]{40}$'),
  name text not null,
  members text[] not null,
  cosign_threshold_bps integer not null check (cosign_threshold_bps between 1 and 10000),
  balance numeric not null default 0,
  created_block bigint not null,
  updated_block bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.indexed_bonds (
  bond_id numeric primary key,
  creator_address text not null check (creator_address ~ '^0x[0-9a-f]{40}$'),
  circle_address text not null check (circle_address ~ '^0x[0-9a-f]{40}$'),
  stake numeric not null,
  deadline timestamptz not null,
  cosign_closes_at timestamptz,
  status integer not null check (status between 0 and 3),
  cosigns integer not null default 0,
  objections integer not null default 0,
  description text not null,
  receipts_hash text,
  receipts_uri text,
  opened_block bigint not null,
  updated_block bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists indexed_bonds_circle_status_deadline on public.indexed_bonds (circle_address, status, deadline);

create table if not exists public.indexed_payouts (
  payout_id numeric primary key,
  circle_address text not null check (circle_address ~ '^0x[0-9a-f]{40}$'),
  recipient_address text not null check (recipient_address ~ '^0x[0-9a-f]{40}$'),
  amount numeric not null,
  executed boolean not null default false,
  cosigns integer not null default 0,
  memo text not null,
  proposed_block bigint not null,
  updated_block bigint not null,
  updated_at timestamptz not null default now()
);
create index if not exists indexed_payouts_circle_executed on public.indexed_payouts (circle_address, executed, payout_id desc);

alter table public.chain_events enable row level security;
alter table public.chain_sync_state enable row level security;
alter table public.indexed_circles enable row level security;
alter table public.indexed_bonds enable row level security;
alter table public.indexed_payouts enable row level security;

create or replace function public.get_circle_snapshot(p_circle_address text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when c.circle_address is null then null else jsonb_build_object(
    'circle', to_jsonb(c),
    'metadata', (select to_jsonb(m) from public.circle_metadata m where m.circle_address = c.circle_address),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.address)
      from public.profiles p
      where p.address = any(c.members)
    ), '[]'::jsonb),
    'bonds', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.status, b.deadline, b.bond_id desc)
      from public.indexed_bonds b
      where b.circle_address = c.circle_address
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(to_jsonb(py) order by py.executed, py.payout_id desc)
      from public.indexed_payouts py
      where py.circle_address = c.circle_address
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (select * from public.circle_activity where circle_address = c.circle_address order by created_at desc limit 50) a
    ), '[]'::jsonb),
    'indexedThroughBlock', (select last_finalized_block from public.chain_sync_state where chain_id = 143)
  ) end
  from public.indexed_circles c
  where c.circle_address = lower(p_circle_address)
  limit 1;
$$;

revoke all on function public.get_circle_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_circle_snapshot(text) to service_role;


-- Source: supabase/migrations/202608190001_atomic_indexer_ingestion.sql
-- Replays one contiguous finalized event batch into canonical projections and
-- advances the cursor in the same transaction. Safe to retry and safe against
-- concurrent workers.

create or replace function public.apply_chain_event_batch(
  p_chain_id bigint,
  p_deployment_block bigint,
  p_from_block bigint,
  p_last_finalized_block bigint,
  p_last_finalized_hash text,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync public.chain_sync_state%rowtype;
  v_event record;
  v_payload jsonb;
  v_status integer;
begin
  if p_last_finalized_block < p_from_block then
    raise exception 'Indexer block range is invalid';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(
      chain_id bigint, block_number bigint
    )
    where e.chain_id <> p_chain_id
      or e.block_number < p_from_block
      or e.block_number > p_last_finalized_block
  ) then
    raise exception 'Indexer event is outside its declared chain or block range';
  end if;

  perform pg_advisory_xact_lock(p_chain_id);
  select * into v_sync
  from public.chain_sync_state
  where chain_id = p_chain_id
  for update;

  if found then
    if v_sync.deployment_block <> p_deployment_block then
      raise exception 'Deployment block does not match the existing cursor';
    end if;
    if p_last_finalized_block <= v_sync.last_finalized_block then
      return jsonb_build_object('applied', false, 'lastFinalizedBlock', v_sync.last_finalized_block);
    end if;
    if p_from_block <> v_sync.last_finalized_block + 1 then
      raise exception 'Indexer batch is not contiguous with the existing cursor';
    end if;
  elsif p_from_block <> p_deployment_block then
    raise exception 'First indexer batch must begin at the deployment block';
  end if;

  for v_event in
    select *
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as x(
      chain_id bigint, tx_hash text, log_index integer, block_number bigint,
      block_hash text, contract_address text, event_name text, circle_address text,
      actor_address text, bond_id numeric, payout_id numeric, payload jsonb,
      block_timestamp timestamptz
    )
    order by block_number, log_index
  loop
    v_payload := coalesce(v_event.payload, '{}'::jsonb);

    insert into public.chain_events (
      chain_id, tx_hash, log_index, block_number, block_hash, contract_address,
      event_name, circle_address, actor_address, bond_id, payout_id, payload, block_timestamp
    ) values (
      v_event.chain_id, lower(v_event.tx_hash), v_event.log_index, v_event.block_number,
      lower(v_event.block_hash), lower(v_event.contract_address), v_event.event_name,
      lower(v_event.circle_address), lower(v_event.actor_address), v_event.bond_id,
      v_event.payout_id, v_payload, v_event.block_timestamp
    )
    on conflict (chain_id, tx_hash, log_index) do nothing;

    case v_event.event_name
      when 'CircleCreated' then
        insert into public.indexed_circles (
          circle_address, creator_address, name, members, cosign_threshold_bps,
          balance, created_block, updated_block, updated_at
        ) values (
          lower(v_payload->>'circle'), lower(v_payload->>'creator'), v_payload->>'name',
          array(select lower(value) from jsonb_array_elements_text(v_payload->'members')),
          (v_payload->>'cosignThresholdBps')::integer, 0, v_event.block_number,
          v_event.block_number, now()
        )
        on conflict (circle_address) do update set
          creator_address = excluded.creator_address,
          name = excluded.name,
          members = excluded.members,
          cosign_threshold_bps = excluded.cosign_threshold_bps,
          updated_block = greatest(public.indexed_circles.updated_block, excluded.updated_block),
          updated_at = now();

      when 'BondOpened' then
        insert into public.indexed_bonds (
          bond_id, creator_address, circle_address, stake, deadline, cosign_closes_at,
          status, cosigns, objections, description, receipts_hash, receipts_uri,
          opened_block, updated_block, updated_at
        ) values (
          (v_payload->>'id')::numeric, lower(v_payload->>'creator'), lower(v_payload->>'circle'),
          (v_payload->>'stake')::numeric, to_timestamp((v_payload->>'deadline')::numeric), null,
          0, 0, 0, v_payload->>'description', null, null,
          v_event.block_number, v_event.block_number, now()
        )
        on conflict (bond_id) do nothing;

      when 'BondDeclared' then
        update public.indexed_bonds set
          status = 1,
          cosign_closes_at = to_timestamp((v_payload->>'cosignClosesAt')::numeric),
          receipts_hash = v_payload->>'receiptsHash',
          receipts_uri = v_payload->>'receiptsUri',
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Cosigned' then
        update public.indexed_bonds set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Objected' then
        update public.indexed_bonds set
          objections = (v_payload->>'objections')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'BondResolved' then
        v_status := (v_payload->>'status')::integer;
        update public.indexed_bonds set
          status = v_status,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;
        if v_status = 3 then
          update public.indexed_circles set
            balance = balance + (v_payload->>'stake')::numeric,
            updated_block = v_event.block_number,
            updated_at = now()
          where circle_address = lower(v_event.circle_address);
        end if;

      when 'PayoutProposed' then
        insert into public.indexed_payouts (
          payout_id, circle_address, recipient_address, amount, executed, cosigns,
          memo, proposed_block, updated_block, updated_at
        ) values (
          (v_payload->>'payoutId')::numeric, lower(v_payload->>'circle'),
          lower(v_payload->>'to'), (v_payload->>'amount')::numeric, false, 0,
          v_payload->>'memo', v_event.block_number, v_event.block_number, now()
        )
        on conflict (payout_id) do nothing;

      when 'PayoutCosigned' then
        update public.indexed_payouts set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;

      when 'PayoutExecuted' then
        update public.indexed_payouts set
          executed = true,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;
        update public.indexed_circles set
          balance = balance - (v_payload->>'amount')::numeric,
          updated_block = v_event.block_number,
          updated_at = now()
        where circle_address = lower(v_payload->>'circle');
      else
        raise exception 'Unsupported Bondline event: %', v_event.event_name;
    end case;
  end loop;

  insert into public.chain_sync_state (
    chain_id, deployment_block, last_finalized_block, last_finalized_hash, updated_at
  ) values (
    p_chain_id, p_deployment_block, p_last_finalized_block, lower(p_last_finalized_hash), now()
  )
  on conflict (chain_id) do update set
    last_finalized_block = excluded.last_finalized_block,
    last_finalized_hash = excluded.last_finalized_hash,
    updated_at = now();

  return jsonb_build_object(
    'applied', true,
    'lastFinalizedBlock', p_last_finalized_block,
    'eventCount', jsonb_array_length(coalesce(p_events, '[]'::jsonb)),
    'circleCount', (select count(*) from public.indexed_circles),
    'bondCount', (select count(*) from public.indexed_bonds),
    'payoutCount', (select count(*) from public.indexed_payouts)
  );
end;
$$;

revoke all on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  to service_role;

-- Indexed snapshots use canonical chain activity rather than browser-authored rows.
create or replace function public.get_circle_snapshot(p_circle_address text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when c.circle_address is null then null else jsonb_build_object(
    'circle', to_jsonb(c),
    'metadata', (select to_jsonb(m) from public.circle_metadata m where m.circle_address = c.circle_address),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.address)
      from public.profiles p where p.address = any(c.members)
    ), '[]'::jsonb),
    'bonds', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.status, b.deadline, b.bond_id desc)
      from public.indexed_bonds b where b.circle_address = c.circle_address
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(to_jsonb(py) order by py.executed, py.payout_id desc)
      from public.indexed_payouts py where py.circle_address = c.circle_address
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.block_number desc, e.log_index desc)
      from (
        select * from public.chain_events
        where chain_id = 143 and circle_address = c.circle_address
        order by block_number desc, log_index desc limit 50
      ) e
    ), '[]'::jsonb),
    'indexedThroughBlock', (
      select last_finalized_block from public.chain_sync_state where chain_id = 143
    )
  ) end
  from public.indexed_circles c
  where c.circle_address = lower(p_circle_address)
  limit 1;
$$;

revoke all on function public.get_circle_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_circle_snapshot(text) to service_role;


-- Source: supabase/migrations/202608220001_remove_browser_activity.sql
-- Chain activity is canonical data from the finalized-event indexer. Remove
-- the legacy browser-authored table and anonymous write path so Circle history
-- cannot be forged with the public Supabase anon key.

drop policy if exists "public Circle activity read" on public.circle_activity;
drop policy if exists "public Circle activity write" on public.circle_activity;
drop table if exists public.circle_activity;


-- Source: supabase/migrations/202610130001_metropolis_events.sql
-- Replays one contiguous finalized event batch into canonical projections and
-- advances the cursor in the same transaction. Safe to retry and safe against
-- concurrent workers.

create or replace function public.apply_chain_event_batch(
  p_chain_id bigint,
  p_deployment_block bigint,
  p_from_block bigint,
  p_last_finalized_block bigint,
  p_last_finalized_hash text,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync public.chain_sync_state%rowtype;
  v_event record;
  v_payload jsonb;
  v_status integer;
begin
  if p_last_finalized_block < p_from_block then
    raise exception 'Indexer block range is invalid';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(
      chain_id bigint, block_number bigint
    )
    where e.chain_id <> p_chain_id
      or e.block_number < p_from_block
      or e.block_number > p_last_finalized_block
  ) then
    raise exception 'Indexer event is outside its declared chain or block range';
  end if;

  perform pg_advisory_xact_lock(p_chain_id);
  select * into v_sync
  from public.chain_sync_state
  where chain_id = p_chain_id
  for update;

  if found then
    if v_sync.deployment_block <> p_deployment_block then
      raise exception 'Deployment block does not match the existing cursor';
    end if;
    if p_last_finalized_block <= v_sync.last_finalized_block then
      return jsonb_build_object('applied', false, 'lastFinalizedBlock', v_sync.last_finalized_block);
    end if;
    if p_from_block <> v_sync.last_finalized_block + 1 then
      raise exception 'Indexer batch is not contiguous with the existing cursor';
    end if;
  elsif p_from_block <> p_deployment_block then
    raise exception 'First indexer batch must begin at the deployment block';
  end if;

  for v_event in
    select *
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as x(
      chain_id bigint, tx_hash text, log_index integer, block_number bigint,
      block_hash text, contract_address text, event_name text, circle_address text,
      actor_address text, bond_id numeric, payout_id numeric, payload jsonb,
      block_timestamp timestamptz
    )
    order by block_number, log_index
  loop
    v_payload := coalesce(v_event.payload, '{}'::jsonb);

    insert into public.chain_events (
      chain_id, tx_hash, log_index, block_number, block_hash, contract_address,
      event_name, circle_address, actor_address, bond_id, payout_id, payload, block_timestamp
    ) values (
      v_event.chain_id, lower(v_event.tx_hash), v_event.log_index, v_event.block_number,
      lower(v_event.block_hash), lower(v_event.contract_address), v_event.event_name,
      lower(v_event.circle_address), lower(v_event.actor_address), v_event.bond_id,
      v_event.payout_id, v_payload, v_event.block_timestamp
    )
    on conflict (chain_id, tx_hash, log_index) do nothing;

    case v_event.event_name
      when 'CircleCreated' then
        insert into public.indexed_circles (
          circle_address, creator_address, name, members, cosign_threshold_bps,
          balance, created_block, updated_block, updated_at
        ) values (
          lower(v_payload->>'circle'), lower(v_payload->>'creator'), v_payload->>'name',
          array(select lower(value) from jsonb_array_elements_text(v_payload->'members')),
          (v_payload->>'cosignThresholdBps')::integer, 0, v_event.block_number,
          v_event.block_number, now()
        )
        on conflict (circle_address) do update set
          creator_address = excluded.creator_address,
          name = excluded.name,
          members = excluded.members,
          cosign_threshold_bps = excluded.cosign_threshold_bps,
          updated_block = greatest(public.indexed_circles.updated_block, excluded.updated_block),
          updated_at = now();

      when 'BondOpened' then
        insert into public.indexed_bonds (
          bond_id, creator_address, circle_address, stake, deadline, cosign_closes_at,
          status, cosigns, objections, description, receipts_hash, receipts_uri,
          opened_block, updated_block, updated_at
        ) values (
          (v_payload->>'id')::numeric, lower(v_payload->>'creator'), lower(v_payload->>'circle'),
          (v_payload->>'stake')::numeric, to_timestamp((v_payload->>'deadline')::numeric), null,
          0, 0, 0, v_payload->>'description', null, null,
          v_event.block_number, v_event.block_number, now()
        )
        on conflict (bond_id) do nothing;

      when 'BondDeclared' then
        update public.indexed_bonds set
          status = 1,
          cosign_closes_at = to_timestamp((v_payload->>'cosignClosesAt')::numeric),
          receipts_hash = v_payload->>'receiptsHash',
          receipts_uri = v_payload->>'receiptsUri',
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Cosigned' then
        update public.indexed_bonds set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Objected' then
        update public.indexed_bonds set
          objections = (v_payload->>'objections')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'BondResolved' then
        v_status := (v_payload->>'status')::integer;
        update public.indexed_bonds set
          status = v_status,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;
        if v_status = 3 then
          update public.indexed_circles set
            balance = balance + (v_payload->>'stake')::numeric,
            updated_block = v_event.block_number,
            updated_at = now()
          where circle_address = lower(v_event.circle_address);
        end if;

      when 'PayoutProposed' then
        insert into public.indexed_payouts (
          payout_id, circle_address, recipient_address, amount, executed, cosigns,
          memo, proposed_block, updated_block, updated_at
        ) values (
          (v_payload->>'payoutId')::numeric, lower(v_payload->>'circle'),
          lower(v_payload->>'to'), (v_payload->>'amount')::numeric, false, 0,
          v_payload->>'memo', v_event.block_number, v_event.block_number, now()
        )
        on conflict (payout_id) do nothing;

      when 'PayoutCosigned' then
        update public.indexed_payouts set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;

      when 'PayoutExecuted' then
        update public.indexed_payouts set
          executed = true,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;
        update public.indexed_circles set
          balance = balance - (v_payload->>'amount')::numeric,
          updated_block = v_event.block_number,
          updated_at = now()
        where circle_address = lower(v_payload->>'circle');
      when 'CircleJoined' then
        update public.indexed_circles set
          members = case when lower(v_payload->>'member') = any(members) then members else array_append(members, lower(v_payload->>'member')) end,
          updated_block = v_event.block_number, updated_at = now()
        where circle_address = v_event.circle_address;
      when 'CommitmentVerified' then
        update public.indexed_bonds set receipts_hash = v_payload->>'evidenceHash', updated_block = v_event.block_number, updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;
      when 'PotRewardClaimed' then
        update public.indexed_circles set balance = balance - (v_payload->>'amount')::numeric,
          updated_block = v_event.block_number, updated_at = now()
        where circle_address = lower(v_payload->>'circle');
      when 'CommitmentBacked', 'VerificationConfigured', 'PotPeriodClosed', 'RefundCredited', 'VerifierTrustChanged', 'TesterJoined', 'MemberInvited' then
        null; -- Canonical events retained for social history and analytics.
      else
        raise exception 'Unsupported Bondline event: %', v_event.event_name;
    end case;
  end loop;

  insert into public.chain_sync_state (
    chain_id, deployment_block, last_finalized_block, last_finalized_hash, updated_at
  ) values (
    p_chain_id, p_deployment_block, p_last_finalized_block, lower(p_last_finalized_hash), now()
  )
  on conflict (chain_id) do update set
    last_finalized_block = excluded.last_finalized_block,
    last_finalized_hash = excluded.last_finalized_hash,
    updated_at = now();

  return jsonb_build_object(
    'applied', true,
    'lastFinalizedBlock', p_last_finalized_block,
    'eventCount', jsonb_array_length(coalesce(p_events, '[]'::jsonb)),
    'circleCount', (select count(*) from public.indexed_circles),
    'bondCount', (select count(*) from public.indexed_bonds),
    'payoutCount', (select count(*) from public.indexed_payouts)
  );
end;
$$;

revoke all on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  to service_role;

-- Indexed snapshots use canonical chain activity rather than browser-authored rows.
create or replace function public.get_circle_snapshot(p_circle_address text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when c.circle_address is null then null else jsonb_build_object(
    'circle', to_jsonb(c),
    'metadata', (select to_jsonb(m) from public.circle_metadata m where m.circle_address = c.circle_address),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.address)
      from public.profiles p where p.address = any(c.members)
    ), '[]'::jsonb),
    'bonds', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.status, b.deadline, b.bond_id desc)
      from public.indexed_bonds b where b.circle_address = c.circle_address
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(to_jsonb(py) order by py.executed, py.payout_id desc)
      from public.indexed_payouts py where py.circle_address = c.circle_address
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.block_number desc, e.log_index desc)
      from (
        select * from public.chain_events
        where chain_id = (select chain_id from public.chain_sync_state limit 1) and circle_address = c.circle_address
        order by block_number desc, log_index desc limit 50
      ) e
    ), '[]'::jsonb),
    'indexedThroughBlock', (
      select last_finalized_block from public.chain_sync_state where chain_id = (select chain_id from public.chain_sync_state limit 1)
    )
  ) end
  from public.indexed_circles c
  where c.circle_address = lower(p_circle_address)
  limit 1;
$$;

revoke all on function public.get_circle_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_circle_snapshot(text) to service_role;

-- One database per immutable deployment. Aggregate in SQL to avoid REST row-limit undercounts.
create or replace function public.bondline_analytics(p_chain_id bigint)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'cosigns',(select count(*) from public.chain_events where chain_id=p_chain_id and event_name='CommitmentBacked'),
 'uniqueCosigners',(select count(distinct actor_address) from public.chain_events where chain_id=p_chain_id and event_name in ('CommitmentBacked','Cosigned')),
 'testers',(select count(distinct actor_address) from public.chain_events where chain_id=p_chain_id and event_name='TesterJoined'),
 'transactions',(select count(distinct tx_hash) from public.chain_events where chain_id=p_chain_id),
 'source','Canonical finalized events via Envio HyperSync / RPC'
); $$;
revoke all on function public.bondline_analytics(bigint) from public,anon,authenticated;
grant execute on function public.bondline_analytics(bigint) to service_role;


-- Source: supabase/migrations/202610130002_retry_overlapping_batches.sql
-- Replays one contiguous finalized event batch into canonical projections and
-- advances the cursor in the same transaction. Safe to retry and safe against
-- concurrent workers.

create or replace function public.apply_chain_event_batch(
  p_chain_id bigint,
  p_deployment_block bigint,
  p_from_block bigint,
  p_last_finalized_block bigint,
  p_last_finalized_hash text,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync public.chain_sync_state%rowtype;
  v_event record;
  v_payload jsonb;
  v_status integer;
begin
  if p_last_finalized_block < p_from_block then
    raise exception 'Indexer block range is invalid';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as e(
      chain_id bigint, block_number bigint
    )
    where e.chain_id <> p_chain_id
      or e.block_number < p_from_block
      or e.block_number > p_last_finalized_block
  ) then
    raise exception 'Indexer event is outside its declared chain or block range';
  end if;

  perform pg_advisory_xact_lock(p_chain_id);
  select * into v_sync
  from public.chain_sync_state
  where chain_id = p_chain_id
  for update;

  if found then
    if v_sync.deployment_block <> p_deployment_block then
      raise exception 'Deployment block does not match the existing cursor';
    end if;
    if p_last_finalized_block <= v_sync.last_finalized_block or p_from_block <= v_sync.last_finalized_block then
      return jsonb_build_object('applied', false, 'lastFinalizedBlock', v_sync.last_finalized_block);
    end if;
    if p_from_block <> v_sync.last_finalized_block + 1 then
      raise exception 'Indexer batch is not contiguous with the existing cursor';
    end if;
  elsif p_from_block <> p_deployment_block then
    raise exception 'First indexer batch must begin at the deployment block';
  end if;

  for v_event in
    select *
    from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as x(
      chain_id bigint, tx_hash text, log_index integer, block_number bigint,
      block_hash text, contract_address text, event_name text, circle_address text,
      actor_address text, bond_id numeric, payout_id numeric, payload jsonb,
      block_timestamp timestamptz
    )
    order by block_number, log_index
  loop
    v_payload := coalesce(v_event.payload, '{}'::jsonb);

    insert into public.chain_events (
      chain_id, tx_hash, log_index, block_number, block_hash, contract_address,
      event_name, circle_address, actor_address, bond_id, payout_id, payload, block_timestamp
    ) values (
      v_event.chain_id, lower(v_event.tx_hash), v_event.log_index, v_event.block_number,
      lower(v_event.block_hash), lower(v_event.contract_address), v_event.event_name,
      lower(v_event.circle_address), lower(v_event.actor_address), v_event.bond_id,
      v_event.payout_id, v_payload, v_event.block_timestamp
    )
    on conflict (chain_id, tx_hash, log_index) do nothing;

    case v_event.event_name
      when 'CircleCreated' then
        insert into public.indexed_circles (
          circle_address, creator_address, name, members, cosign_threshold_bps,
          balance, created_block, updated_block, updated_at
        ) values (
          lower(v_payload->>'circle'), lower(v_payload->>'creator'), v_payload->>'name',
          array(select lower(value) from jsonb_array_elements_text(v_payload->'members')),
          (v_payload->>'cosignThresholdBps')::integer, 0, v_event.block_number,
          v_event.block_number, now()
        )
        on conflict (circle_address) do update set
          creator_address = excluded.creator_address,
          name = excluded.name,
          members = excluded.members,
          cosign_threshold_bps = excluded.cosign_threshold_bps,
          updated_block = greatest(public.indexed_circles.updated_block, excluded.updated_block),
          updated_at = now();

      when 'BondOpened' then
        insert into public.indexed_bonds (
          bond_id, creator_address, circle_address, stake, deadline, cosign_closes_at,
          status, cosigns, objections, description, receipts_hash, receipts_uri,
          opened_block, updated_block, updated_at
        ) values (
          (v_payload->>'id')::numeric, lower(v_payload->>'creator'), lower(v_payload->>'circle'),
          (v_payload->>'stake')::numeric, to_timestamp((v_payload->>'deadline')::numeric), null,
          0, 0, 0, v_payload->>'description', null, null,
          v_event.block_number, v_event.block_number, now()
        )
        on conflict (bond_id) do nothing;

      when 'BondDeclared' then
        update public.indexed_bonds set
          status = 1,
          cosign_closes_at = to_timestamp((v_payload->>'cosignClosesAt')::numeric),
          receipts_hash = v_payload->>'receiptsHash',
          receipts_uri = v_payload->>'receiptsUri',
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Cosigned' then
        update public.indexed_bonds set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'Objected' then
        update public.indexed_bonds set
          objections = (v_payload->>'objections')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;

      when 'BondResolved' then
        v_status := (v_payload->>'status')::integer;
        update public.indexed_bonds set
          status = v_status,
          updated_block = v_event.block_number,
          updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;
        if v_status = 3 then
          update public.indexed_circles set
            balance = balance + (v_payload->>'stake')::numeric,
            updated_block = v_event.block_number,
            updated_at = now()
          where circle_address = lower(v_event.circle_address);
        end if;

      when 'PayoutProposed' then
        insert into public.indexed_payouts (
          payout_id, circle_address, recipient_address, amount, executed, cosigns,
          memo, proposed_block, updated_block, updated_at
        ) values (
          (v_payload->>'payoutId')::numeric, lower(v_payload->>'circle'),
          lower(v_payload->>'to'), (v_payload->>'amount')::numeric, false, 0,
          v_payload->>'memo', v_event.block_number, v_event.block_number, now()
        )
        on conflict (payout_id) do nothing;

      when 'PayoutCosigned' then
        update public.indexed_payouts set
          cosigns = (v_payload->>'cosigns')::integer,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;

      when 'PayoutExecuted' then
        update public.indexed_payouts set
          executed = true,
          updated_block = v_event.block_number,
          updated_at = now()
        where payout_id = (v_payload->>'payoutId')::numeric;
        update public.indexed_circles set
          balance = balance - (v_payload->>'amount')::numeric,
          updated_block = v_event.block_number,
          updated_at = now()
        where circle_address = lower(v_payload->>'circle');
      when 'CircleJoined' then
        update public.indexed_circles set
          members = case when lower(v_payload->>'member') = any(members) then members else array_append(members, lower(v_payload->>'member')) end,
          updated_block = v_event.block_number, updated_at = now()
        where circle_address = v_event.circle_address;
      when 'CommitmentVerified' then
        update public.indexed_bonds set receipts_hash = v_payload->>'evidenceHash', updated_block = v_event.block_number, updated_at = now()
        where bond_id = (v_payload->>'id')::numeric;
      when 'PotRewardClaimed' then
        update public.indexed_circles set balance = balance - (v_payload->>'amount')::numeric,
          updated_block = v_event.block_number, updated_at = now()
        where circle_address = lower(v_payload->>'circle');
      when 'CommitmentBacked', 'VerificationConfigured', 'PotPeriodClosed', 'RefundCredited', 'VerifierTrustChanged', 'TesterJoined', 'MemberInvited' then
        null; -- Canonical events retained for social history and analytics.
      else
        raise exception 'Unsupported Bondline event: %', v_event.event_name;
    end case;
  end loop;

  insert into public.chain_sync_state (
    chain_id, deployment_block, last_finalized_block, last_finalized_hash, updated_at
  ) values (
    p_chain_id, p_deployment_block, p_last_finalized_block, lower(p_last_finalized_hash), now()
  )
  on conflict (chain_id) do update set
    last_finalized_block = excluded.last_finalized_block,
    last_finalized_hash = excluded.last_finalized_hash,
    updated_at = now();

  return jsonb_build_object(
    'applied', true,
    'lastFinalizedBlock', p_last_finalized_block,
    'eventCount', jsonb_array_length(coalesce(p_events, '[]'::jsonb)),
    'circleCount', (select count(*) from public.indexed_circles),
    'bondCount', (select count(*) from public.indexed_bonds),
    'payoutCount', (select count(*) from public.indexed_payouts)
  );
end;
$$;

revoke all on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_chain_event_batch(bigint, bigint, bigint, bigint, text, jsonb)
  to service_role;



notify pgrst, 'reload schema';
commit;

-- Verification: expect the six named tables to exist and zero initial event counts.
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('profiles','circle_messages','indexed_circles','indexed_bonds','chain_events','chain_sync_state') order by table_name;
select public.bondline_analytics(10143);
-- The index cursor is created by the real event backfill; do not insert a fake cursor.
