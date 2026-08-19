# Bondline production roadmap

This roadmap turns the hackathon build into a production system without replacing working paths prematurely.

## Phase 1 — Trust and data integrity

- [x] Require receipt evidence in the UI and contract before a cosign opens.
- [x] Introduce wallet-signed, gasless HTTP sessions.
- [x] Move private chat reads and writes behind server-side membership checks.
- [x] Move profile, Circle metadata, and media writes behind the same session boundary.
- [x] Replace public Storage mutation policies with owner/member-scoped server routes.
- [ ] Add request rate limits and structured audit records.

## Phase 2 — Canonical chain data

- [ ] Index every Core and Factory event with block number, transaction hash, and log index.
- [ ] Backfill from the deployment block and make ingestion idempotent.
- [ ] Reconcile indexed projections against contract reads on a schedule.
- [x] Define canonical indexed projections and an atomic Circle snapshot endpoint.
- [ ] Populate and reconcile the projections before enabling the endpoint in the UI.
- [ ] Add cursor pagination for long Bond and activity histories.
- [ ] Hydrate React Query from the server and invalidate only the affected Circle after confirmed writes.

## Phase 3 — Retention

- [ ] Browser and email notifications for deadlines, cosigns, resolutions, and payouts.
- [ ] Durable multi-file receipts whose file-byte hashes are committed on-chain.
- [ ] Recurring Bond templates and weekly Circle summaries.
- [ ] Shareable, expiring Circle invitations.

## Phase 4 — Protocol maturity

- [ ] Governed membership and threshold changes.
- [ ] Payout expiry and cancellation.
- [ ] Invariant/fuzz expansion, independent audit, and migration runbook.
- [ ] Contextual reputation and Circle health metrics.

## Deployment order for the secure chat slice

1. Configure `SUPABASE_SERVICE_ROLE_KEY`, `BONDLINE_SESSION_SECRET`, and `MONAD_RPC_URL` in the hosting environment.
2. Deploy the web application containing the authenticated API routes.
3. Run `supabase/migrations/202608130001_secure_circle_chat.sql`, then `202608130002_secure_social_writes.sql`.
4. Verify that a member can unlock chat and a non-member receives HTTP 403.

Do not run the SQL migration before the new web routes are live, or chat will be temporarily unavailable.
