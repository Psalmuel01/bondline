-- Additive migration. No existing escrow, chat, or index projections are reset.
create table if not exists public.verification_jobs (
  chain_id integer not null,
  core_address text not null,
  commitment_id text not null check (commitment_id ~ '^(0|[1-9][0-9]{0,77})$'),
  condition_hash text not null,
  phase text not null default 'queued' check (phase in ('queued','checking','in_progress','requirement_met','verified','failed','error')),
  transaction_hash text,
  requested_at timestamptz not null default now(),
  checked_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  result jsonb,
  error text,
  primary key (chain_id,core_address,commitment_id)
);
alter table public.verification_jobs enable row level security;
revoke all on public.verification_jobs from anon,authenticated;
grant all on public.verification_jobs to service_role;

create or replace function public.request_verification(p_chain integer,p_core text,p_id text,p_hash text,p_tx text default null)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  insert into verification_jobs(chain_id,core_address,commitment_id,condition_hash,transaction_hash)
  values(p_chain,lower(p_core),p_id,p_hash,p_tx)
  on conflict(chain_id,core_address,commitment_id) do update
    set phase='queued', requested_at=now(),transaction_hash=coalesce(excluded.transaction_hash,verification_jobs.transaction_hash),error=null,lease_id=null,lease_until=null
    where verification_jobs.condition_hash=excluded.condition_hash
      and verification_jobs.requested_at < now()-interval '60 seconds'
      and (verification_jobs.lease_until is null or verification_jobs.lease_until < now())
      and verification_jobs.phase not in ('verified','failed');
  return found;
end $$;

create or replace function public.claim_verification(p_chain integer,p_core text)
returns setof public.verification_jobs language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidate as (
    select chain_id,core_address,commitment_id from verification_jobs
    where chain_id=p_chain and core_address=lower(p_core)
      and (phase='queued' or (phase='checking' and lease_until < now()))
    order by requested_at limit 1 for update skip locked
  )
  update verification_jobs j set phase='checking',lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes'
  from candidate c where j.chain_id=c.chain_id and j.core_address=c.core_address and j.commitment_id=c.commitment_id returning j.*;
end $$;
revoke all on function public.request_verification(integer,text,text,text,text) from public,anon,authenticated;
revoke all on function public.claim_verification(integer,text) from public,anon,authenticated;
grant execute on function public.request_verification(integer,text,text,text,text) to service_role;
grant execute on function public.claim_verification(integer,text) to service_role;

create table if not exists public.verification_workers (
 chain_id integer not null, core_address text not null, heartbeat_at timestamptz not null default now(), primary key(chain_id,core_address)
);
alter table public.verification_workers enable row level security;
revoke all on public.verification_workers from anon,authenticated;
grant all on public.verification_workers to service_role;
alter table public.verification_workers add column if not exists scan_next_id text not null default '0';
