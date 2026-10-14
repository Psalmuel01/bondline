# Workspace consolidation

Signed-in Home is the single Circle workspace, retaining creation, discovery, onboarding, upcoming commitments, and progress. The duplicate Circles navigation item and compact dashboard branch were removed. Existing `/app/circles` links redirect to `/`; onboarding and app calls to action link directly to Home. Commitments, Activity, Profile, and individual Circle detail pages retain their separate functions.

Deployment `dpl_3DVVTmbTHGqt6cd6TAhvCi5ncce3` passed TypeScript and the production build. Live checks confirmed `/app/circles` returns 307 to `/`, and Home, Commitments, and Activity return 200. This navigation-only update does not change account or contract logic.

---

# Circle UX follow-up

Deployment `dpl_EGVWhmzcRy6JeRUEDKytztnA1u5Z` passed the production build and TypeScript; all 21 frontend tests passed again. Chat now has a shorter panel, bottom-aligned/grouped messages, inline timestamps, a growing one-line composer, and draft preservation when a previous send completes. The activity sidebar shows three updates with optional expansion and no nested panel. Empty active-goal panels are hidden. Circle Settings moved beside the header actions.

The settings form fills the modal, includes explicit Cancel/Save actions, a cover preview, and a clear display-only Pot target with client validation. Actual components were rendered in isolated localhost fixtures to inspect populated chat and desktop/mobile settings without a wallet or private API requests. Final desktop chat and mobile settings fixtures scored 100 accessibility. These are visual fixtures, not authenticated end-to-end testing or production screenshots; they are not included in the marketing capture pack. The temporary review server was stopped afterward.

---

# Shared visual system follow-up

The perspective grid and beacon now live in the root layout, giving public pages and application routes the same background. Page entrances, modal opening transitions, button press feedback, and hover lift on commitment/Circle/documentation cards share CSS motion rules. Decorative layers cannot intercept pointer events; reduced-motion preferences disable movement. The landing no longer adds a second grid.

Deployment `dpl_2e5c9unugrD13gWyfi4935j38PJa` passed TypeScript and the production build. Desktop Docs and the signed-out mobile Circles app route both scored 100 accessibility/best practices with no console errors ([desktop](quality/shared-docs.json), [mobile](quality/shared-app-mobile.json)). This is a visual-only update; account, contract, indexing, and authorization logic are unchanged. Earlier audit scores below describe their recorded releases, not a new performance measurement of this follow-up.

---

# Lighter design follow-up

The homepage now uses the animated group-chat illustration, a perspective grid, three public navbar links, four concise mechanic steps, and five FAQ questions. Repeated product/how-it-works/Circles/verification/about pages redirect to homepage sections (verified 307 responses). Documentation, security, and legal pages remain available.

Desktop height dropped from 5,934px to 2,835px at the same viewport. Motion includes an explicit chat pause button and respects reduced-motion settings. Desktop/mobile accessibility and best practices scored 100, with no console errors; the mobile performance run scored 86 and SEO 100. [Desktop summary](quality/compact-desktop.json) · [Mobile summary](quality/compact-mobile.json). These figures supersede the homepage metrics below. TypeScript and the new production build passed. The existing test results below cover unchanged application logic.

Homepage screenshots were refreshed from the lighter design, before a final decorative grid opacity/position adjustment. The earlier validation below remains a record of the broader product upgrade.

---

# Public-product release validation

Release: `dpl_A6LGs4j7AXtLMmmKBJXWsx8NcUMY` · [Live site](https://bondline-circle.vercel.app)

This release expands the public website, documentation, onboarding, application navigation, settings, and notifications. It also hardens private export authorization, evidence links, session expiry, and the distinction between missing data and failed reads. Contract logic and deployment addresses were not changed.

## Automated checks

| Check | Result |
| --- | --- |
| `pnpm --dir web typecheck` | Passed |
| `pnpm --dir web test` | 21 passed, 0 failed |
| `forge test --root contracts --offline` | 88 passed across 4 suites, 0 failed; conservation fuzz test runs 256 cases |
| Vercel production build | Passed; 45 generated pages |
| `git diff --check` | Passed |
| Public route checks | 34 expected pages/assets returned 200 |
| Invalid route / malformed Circle address | 404 |
| Unsigned private export | 401 |
| Malformed public activity query | 400 |

[Route results](quality/routes.json) contain the checked paths and statuses. Unit tests verify private export refuses unsigned requests before accessing data, scopes messages to the authenticated author, and paginates; they also cover strict public event queries, notification ownership, bounded external verifier inputs, evidence schemes, prepared Mera signatures, identity matching, and session expiry. Contract tests do not constitute an independent audit.

## Lighthouse

Lighthouse 13.5.0 ran against the public production alias in isolated headless Brave profiles, without authentication or signing. The mobile run uses Lighthouse’s default mobile emulation (412px); desktop uses its desktop preset. These are lab observations, not real-user monitoring or a performance guarantee. Raw capture timestamps are retained in the JSON summaries.

| Final homepage run | Performance | Accessibility | Best practices | SEO | FCP | LCP | Blocking time | Layout shift |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Desktop](quality/lighthouse-desktop.json) | 84 | 100 | 100 | 100 | 1.4s | 1.6s | 0ms | 0.012 |
| [Mobile](quality/lighthouse-mobile.json) | 96 | 100 | 100 | 100 | 1.6s | 2.5s | 30ms | 0.038 |

Neither final homepage run reported browser-console errors. The desktop audit still identifies initial document/font latency and a render-blocking stylesheet; earlier runs varied from 87–92. The final score is reported rather than selecting the highest run.

Circle history, getting-started documentation, security, and signed-out profile scored 100 accessibility and best practices. Activity and the guide were rechecked after heading fixes and both scored 100/100, with no console errors. These audits inspect the rendered state; they do not exercise every interaction or private screen.

## Visual evidence

[Product captures](assets/README.md) document the exact captured states. Desktop and mobile homepage captures show real public contract records. The existing Circle named “Test” and its completed “Post Blog” commitment were not renamed or replaced with invented data. Private chat is not used in marketing captures.

The visual inspection covered homepage layouts, Circle history, documentation, security, and signed-out app introductions. Automated screenshots do not prove tablet layouts, keyboard interactions, modal focus, or authenticated transactions in every device/browser combination.

## Manual checks still needed before a public financial launch

- Return with the existing production-domain passkey, reload, and verify the derived address stays the same; test sign-out and session expiration. Test the optional browser-wallet path on the actual devices to be supported.
- With small test MON amounts and two real accounts, create/join a Circle, create a commitment, back it, submit evidence, approve/reject it, and verify settlement, chat access, notifications, profile history, and export. Repeat the missed-deadline and weekly reward paths. This release did not prompt biometrics or broadcast transactions on behalf of testers.
- Capture authenticated dashboard, creation/detail, activity, and populated profile screens. Publish a real video using the [script and shot list](../web/public/walkthrough-script.md), then set `NEXT_PUBLIC_GUIDANCE_VIDEO_URL` and rebuild.
- Confirm the production indexer cron is advancing and the intended GitHub verifier worker is authorized, funded, and operated regularly. The cron indexes events; it does not operate all verification or settlement jobs. This UI release does not certify continuous job uptime.
- Add real support/private contact information and social URLs when available. GitHub issues are the current public fallback; do not post secrets or personal records there. Privacy/terms are lightweight product disclosures, not a legal review.
- Obtain independent contract review and complete deployment/operational review before moving this v2 release to mainnet. It currently uses Monad testnet 10143 and unaudited contracts. No mainnet deployment was performed here.

CRE orchestration and the encrypted PRF private journal remain unimplemented and are explicitly described that way. Mera is the account layer; Envio HyperSync is the event retrieval integration. No fabricated users, awards, testimonials, or volume were added.

## Source and release provenance

The production release was uploaded with Vercel CLI from a web-only snapshot of current source. Secret environment files and private planning documents were excluded. No Git commit or push was performed for this upgrade; the live deployment and current local source should be committed together when publishing the repository changes. Screenshot/report files added afterward are repository assets and do not change the deployed application.

## 14 October requirements-audit release

The private source-by-source audit is kept outside this public repository, in accordance with the request not to publish planning documents. This release adds the device-local Mera PRF journal, Home commitment launcher, Circle member ranking, custom deadlines/UTF-8 goal bounds, accepted Circle join/tester counts, a loopback-only deployed-code fork lifecycle script, and a CRE workflow/receiver package.

Validation: 27 frontend tests, TypeScript, 100 offline Foundry test executions, 8 official CRE SDK runtime tests, CRE TypeScript and real WebAssembly compilation passed. The Vercel journal release generated 46 routes and was deployed to the existing production alias. The later analytics-only update uses the same deployment target. Existing contracts and database schema were not replaced.

The local Anvil test executed 22 transactions using deployed testnet code, creating three labeled synthetic Circles and five fixture accounts, with three successful commitments, one failed commitment, one active commitment, and a weekly Pot close/claim. These are local fixtures, not live Monad receipts or real users.

The production journal entry page's mobile Lighthouse lab result was performance 99, accessibility 100, and best practices 100. Its noindex policy intentionally excludes this private-account route from search. This is a signed-out route check; the authenticator fixture tests use actual SDK encryption but do not replace physical passkey confirmation.

Live checks confirmed chain 10143, protocol v2, manifest/factory wiring, a working canonical snapshot and analytics API, and a progressing finalized index cursor. Authenticated Envio HyperSync returned a deployed-contract log. The public sample checked contained one Circle, two members, and one completed commitment; opted-in tester count was zero.

User reported no errors on the requested live returning-passkey/journal save, lock/reopen and encrypted backup checks. These are user-reported results, not agent-observed biometrics. Backup import, injected-wallet and phone checks are not separately confirmed.

Remaining readiness gaps: representative live failure/Pot and automatic-verification receipts; at least five real testers and feedback; CRE login/tenant deployment access (user confirms no account/access yet), trusted production forwarder/owner, receiver deployment/registration and activated workflow. Source-verification API returned403, so explorer verification remains unconfirmed. No new demo/pitch/bounty recordings were produced. CRE source/compiler tests do not establish a live DON integration. Contracts remain unaudited.

## Non-CRE bounty closure checks

The user excluded Community Team and Privy. The authenticated portal entry selects Consumer Products & Payments, Envio, both Mera bounties, and CRE. Envio's actual requirement expressly accepts HyperIndex, HyperSync or HyperRPC meaningfully driving an app feature; a HyperIndex Cloud deployment is not required by that field. Sponsor videos for Envio and both Mera entries are optional. CRE's required video accepts a successful official CLI simulation or a live deployment; its current zero-report preflight is not a full GitHub-verification demonstration.

The user confirmed encrypted journal backup import restored the same notes without errors, following the earlier save/lock/reopen/export check. Private reflections can now optionally reference the user's commitment and Core deployment, with that association inside the encrypted document. Existing unlinked notes/backups remain compatible.

The Core, Factory and Circle implementation runtime artifacts match deployed bytecode with constructor immutables masked. Their compiler source bytes exactly match the already-public repository. The verification API returned success for all three on MonadVision (perfect match) and MonadScan (verified); see deployments/monad-testnet-verification.json. The public Git main matched local commit 7a377f1 before this follow-up change.

At the fresh live check there were two Circles, one completed commitment, zero tester-cohort enrollments, and a progressing canonical cursor. Representative live balance/failure/Pot checks and at least five real people still need confirmation. Submission is locked/read-only on the portal; no submission fields were changed during this audit.
