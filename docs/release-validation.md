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
