# Bondline web

Bondline is a group commitment app on Monad testnet. A Circle stakes MON against
personal deadlines: meet the Line and the Circle cosigns a refund; miss it and
the stake funds the shared Pot.

## What is on-chain

- Circle membership, cosign threshold, and Pot balance
- Bonds, deadlines, stakes, receipts hashes, cosigns, and resolutions
- Payout proposals and their cosigns

## What is off-chain

Supabase makes the UI human without changing custody or contract rules:

- Display names, avatar image URLs, and avatar colors
- Circle mission, Pot goal, and banner image URL
- Circle chat and activity rows recorded by the UI

This social layer is optional. The core app still works with only the contract
addresses configured; chat, profile editing, and Circle customization show
setup states until Supabase is enabled.

## Local setup

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Set the deployed Monad testnet contract addresses:

```env
NEXT_PUBLIC_CORE_ADDRESS=0xyour_deployed_core_address
NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS=0xyour_deployed_factory_address
```

To enable profiles, Circle metadata, chat, and app-recorded activity, create a
Supabase project, run [`../supabase/schema.sql`](../supabase/schema.sql) in its
SQL Editor, then add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only values used by wallet-authenticated private features
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BONDLINE_SESSION_SECRET=replace-with-at-least-32-random-characters
MONAD_RPC_URL=https://rpc.monad.xyz
```

Restart `npm run dev` after changing `.env.local`.

## Product walkthrough

1. Connect an injected wallet on Monad testnet.
2. Click **New Circle** and add at least one other member wallet.
3. Open the Circle and click your own name to add a profile name, avatar URL,
   or avatar color.
4. Circle members can select **Customize Circle** to set a mission, Pot goal,
   and optional banner image URL.
5. Open a Bond, declare it complete with a receipt URL, and let the crew
   cosign it. Images, GitHub links, Loom links, and YouTube links receive a
   lightweight receipt preview.
6. Use the header notification center for urgent deadlines and pending cosigns.

## Activity and notifications

The landing feed and Circle workspace read live contract state. Bonds and
payout proposals submitted through this frontend are also saved to Supabase
with an exact app timestamp and explorer transaction link.

Existing chain history is shown as a state-derived fallback. For a canonical,
historical feed of every contract event, deploy an Envio/HyperIndex indexer once
the contracts are deployed and verified. The contracts already emit the needed
Bond and payout events.

Notifications are currently in-app. Browser/mobile push needs a VAPID-enabled
service worker or a notification provider and should be added only with a
wallet-authenticated backend.

## Security note

Circle chat is served only through wallet-authenticated API routes that verify
current on-chain membership. The browser never receives the Supabase service
role key. Profile, metadata, activity, and media hardening are tracked in
`../docs/production-roadmap.md`; treat those remaining anonymous writes as beta
until their migration is complete.

## Verification

```bash
npm run build
```

The app targets Monad testnet and test MON only. It is not audited.
