-- Run in the NEW v2 database, after creating the Vault secret described below.
-- Supabase Dashboard -> Vault -> New secret:
-- Name: bondline_indexer_secret
-- Value: the SAME BONDLINE_INDEXER_SECRET used by Vercel and web/.env.local.
-- Never use the Supabase publishable/service key as this endpoint secret.

create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from public.chain_sync_state where chain_id = 10143 and deployment_block = 70697469) then
    raise exception 'Run the v2 testnet backfill in this database first.';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'bondline_indexer_secret' and length(decrypted_secret) >= 32) then
    raise exception 'Create Vault secret bondline_indexer_secret with the existing 32+ character BONDLINE_INDEXER_SECRET first.';
  end if;
end $$;

-- HTTP headers contain a decrypted endpoint secret while queued.a
-- Keep request/response tables inaccessible to browser database roles.
revoke all on net.http_request_queue from public, anon, authenticated;
revoke all on net._http_response from public, anon, authenticated;

-- Reusing this name updates this job rather than creating duplicate jobs.
select cron.schedule(
  'bondline-v2-indexer',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://bondline-circle.vercel.app/api/indexer/run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'bondline_indexer_secret' limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);

-- Confirm the named job is active. This does not prove the HTTP call succeeded.
select jobid, jobname, schedule, active from cron.job where jobname = 'bondline-v2-indexer';

-- Run these separately AFTER the job has fired at least once:
-- select id, status_code, timed_out, error_msg, content, created
-- from net._http_response order by id desc limit 5;
-- select chain_id, deployment_block, last_finalized_block, updated_at
-- from public.chain_sync_state where chain_id = 10143;
-- HTTP 200 + an advancing last_finalized_block confirms indexing.
-- To disable just this job: select cron.unschedule('bondline-v2-indexer');
