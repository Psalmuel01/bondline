# Free Render verification service

This is a wake-on-request demo service, not guaranteed deadline automation.
The website stays on Vercel and jobs stay in Supabase. A request wakes a free
Render **Web Service**, which starts the existing CRE CLI worker. It may sleep
again after 15 minutes without inbound traffic. Outbound queue polls do not
prevent sleep. No paid worker, disk, database, or workspace upgrade is required.

The implementation is prepared; a deployment is not validated until the checks
below succeed. Free instances have limited CPU/memory and usage quotas. The CRE
subprocess must fit within those limits; do not silently upgrade if it cannot.

## 1. Prepare a persistent signer

From the repository root, with the existing local app configuration:

```sh
node --env-file=web/.env.local cre/github-verifier/prepare-persistent-signer.mjs
```

This generates `.env.worker.local` with mode 0600 and prints only its public
address. Repeating the command preserves the existing key. Back this file up
securely outside Git. This is a dedicated testnet service signer, never your
administrator wallet key. Do not overwrite the current worker's configuration
or stop it while existing commitments depend on it.

## 2. Publish the branch and app changes

Push `chainlink` with the hosting files and use that branch for Render.
Deploy this branch as a Vercel Preview first to validate it. Production Vercel
still builds from `main`; merge the reviewed changes into `main` and push when
ready. Merely pushing `chainlink` does not publish these new APIs to production.
Keep continuous mode enabled until the cutover in step 6.

## 3. Add encrypted CRE session storage

Apply `supabase/verification-runtime-sessions.sql` in the existing Bondline
Supabase project. It adds one RLS-enabled, service-only table. Do not reset the
database. Deploy the app's `/api/verification/runtime-session` endpoint before
starting the hosted worker.

The CRE CLI needs login authentication even for simulation. API-key auth needs
Chainlink deployment approval, which this account does not currently have. This
demo bootstraps the existing browser login. Refreshed credentials are encrypted
with AES-256-GCM and saved through the authenticated app API, so an ephemeral
Render filesystem need not lose them. The settlement key stays in Render's
environment, not this table. Revoked/expired login sessions can still require
manual `cre login` and a fresh bootstrap. This is not a perpetual API credential.
Do not run separate hosts that refresh the same CRE login concurrently.

## 4. Prepare private environment values

Make sure the official CLI is logged in locally, then run:

```sh
node --env-file=.env.worker.local cre/github-verifier/prepare-render-env.mjs
```

This creates `.env.render-worker.local` (mode 0600), containing **only** the
dedicated signer, worker authentication secret, RPC/Core/app settings, and a
base64-encoded CRE login bootstrap. Base64 is not encryption. Never commit,
record, screenshot, or paste this file into chat. Import it only into your
Bondline Render worker environment. No Supabase service-role key, MetaMask key,
or Render account API key belongs in the worker container.

## 5. Create the free Render Web Service

In Render, choose **New → Web Service**, connect `Psalmuel01/bondline`, and set:

| Setting | Value |
| --- | --- |
| Name | `bondline-verification` |
| Branch | `chainlink` |
| Runtime | Docker |
| Root Directory | Leave empty |
| Dockerfile Path | `cre/github-verifier/Dockerfile` |
| Docker Build Context | Repository root (`.`) |
| Instance Type | **Free** |
| Health Check Path | `/healthz` |
| Auto Deploy | Off during setup |

Import `.env.render-worker.local` into this service's environment and deploy.
The Dockerfile pins the official CRE Linux CLI with a checksum and compiles
the workflow at build time. It forces persistent signing; no new ephemeral
address is generated at boot. Leave your current Mac worker running until
cutover, but avoid simultaneous CRE evaluations using the same login session.

If Render requires payment even for the Free selection, or the build/runtime
exceeds Free limits, stop and report the displayed limitation. Do not select a
paid instance or add an artificial keep-awake cron.

## 6. Authorize and cut over

1. Ensure no active commitments still need the old ephemeral signer, or finish
   those with the old worker first. Existing commitments cannot change signer.
2. In `/verification-setup`, enter the persistent **public** address, authorize
   it using the administrator's MetaMask on Monad testnet **10143**, and fund
   it with a small amount of **test MON**. Confirm transactions yourself.
3. In Vercel Production, keep the existing mode/enabled/worker secret and set:

   ```text
   NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS=<persistent public address>
   BONDLINE_VERIFICATION_EXECUTION=on-demand
   BONDLINE_VERIFICATION_WAKE_URL=https://<actual-render-service>.onrender.com/wake
   ```

4. Update only the local public verifier address to match. Keep the dedicated
   private key in `.env.worker.local` and Render, never Vercel.
5. Rebuild production through the normal push to `main`. Public variables are
   compiled into the frontend. Keep the CRE session/worker secret unchanged
   during this cutover; rotating it also changes the session-encryption key.
6. Once the old commitments are finished, stop the old Mac worker. Let Render
   process a new small commitment, inspect CRE evaluation logs and a real
   settlement receipt, then restart Render and confirm its address is unchanged.
7. Test a cold start after at least 15 minutes without visits/status polling.
   Request a new check from Bondline. Confirm startup messaging, progress,
   settlement and the explorer receipt. This is required before claiming the
   free-hosted path works independently of the Mac.

## User experience and timing

The check endpoint durably queues the request, then attempts an authenticated
POST to Render `/wake`. An open commitment page polls every 10 seconds. While
a queued request has no recent worker heartbeat it shows **Starting verification
service…**, explains startup may take a minute or longer, and retains the job.
After three minutes it shows a delay message and allows retrying startup.
This is a time estimate, not guaranteed progress or completion. The heartbeat
is deployment-wide, not proof a particular job has completed. Closing the page
does not erase the request, but a sleeping service needs a new incoming request
to wake again. An open page may keep the host awake while a request is pending.

While awake the worker polls after a 10-second pause, scans five Core IDs per
poll, and revisits known unfinished goals roughly every minute plus execution
time. Onchain-call rules require a submitted transaction hash before evaluation.
Successful settlement must reach Core **before** the deadline. A sleeping host
cannot promise unattended deadline settlement. Community and native-balance
verification retain their existing behavior.

Health endpoints:

```sh
curl --fail --silent --show-error https://<actual-render-service>.onrender.com/healthz
curl --fail --silent --show-error https://bondline-circle.vercel.app/api/verification/capabilities
```

The Render health request itself wakes the service. `state: running` means the
child process exists, not that every dependency is healthy. On-demand capability
availability indicates the configured funded/authorized signer and wake route;
it is not proof the sleeping host can boot or run CRE. Check a genuine job and
receipt for end-to-end validation. No health request should claim a queue job.
