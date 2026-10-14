export type ContentSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  code?: string;
  links?: { label: string; href: string }[];
};
export type Doc = {
  title: string;
  description: string;
  group: "Start here" | "Using Bondline" | "Trust" | "Developers";
  sections: ContentSection[];
};
export const documentation: Record<string, Doc> = {
  "getting-started": {
    title: "Getting started",
    description: "From your first sign-in to your first commitment.",
    group: "Start here",
    sections: [
      {
        title: "Create or return to your account",
        paragraphs: [
          "Choose Get started, then create an account with a Mera passkey. Your device may use Face ID, Touch ID, its screen lock, or a compatible password manager. To return, choose Sign in with your passkey and use the same credential. Creating another passkey creates another account.",
          "Bondline derives a signing account during the passkey ceremony and ends the signing session afterward. There is no seed phrase screen or custodial account recovery service. A compatible browser wallet is an alternative, not a requirement.",
        ],
      },
      {
        title: "Check your account before funding it",
        paragraphs: [
          "Open the account menu to copy your complete address and see the network and available MON. Send funds only on the network shown. The current v2 deployment is on Monad testnet; test MON has no cash value. A mainnet transfer will not fund an account’s testnet balance.",
          "Your stake and transaction fee both come from your available balance. Leave room for fees; sending the entire balance is not a useful starting point.",
        ],
        links: [
          {
            label: "Monad network documentation",
            href: "https://docs.monad.xyz/developer-essentials/network-information",
          },
        ],
      },
      {
        title: "Join your people",
        paragraphs: [
          "Create a Circle by choosing a name, adding at least one friend’s account address, and choosing the evidence approval threshold. Initial members are registered at creation. To join an existing Circle later, ask a member to invite your address and share the Circle link. Open Members and accept the invitation.",
          "Circle chat is accessible only to members with a valid signed-in app session. On-chain commitments and outcomes are public; chat messages are not published on-chain.",
        ],
        links: [{ label: "Circles guide", href: "/docs/circles" }],
      },
      {
        title: "Make your first commitment",
        paragraphs: [
          "Open your Circle and choose Make a commitment. Describe an achievable goal, choose a deadline, enter a stake, and select a verification method. The next screen shows the exact deadline, amount, and completion rule. Confirm only if those details are right.",
          "A commitment appears after its transaction confirms. For Circle-reviewed goals, submit evidence before the deadline. Encouragement from friends is separate from approval of that evidence.",
        ],
        links: [
          { label: "Commitment guide", href: "/docs/commitments" },
          { label: "Follow the guided walkthrough", href: "/guide" },
        ],
      },
      {
        title: "If something does not work",
        bullets: [
          "A missing balance usually means the wrong network or an unfunded address. Check the account menu.",
          "An expired private session can be renewed with Continue to chat. Renewing a session does not cost gas.",
          "Cancelling the account confirmation leaves the proposed action unsubmitted.",
          "For a pending action, inspect the explorer link before trying again. A failed transaction can still cost a fee.",
          "Do not share a private key, passkey recovery information, or provider secret with support.",
        ],
      },
    ],
  },
  commitments: {
    title: "Commitments",
    description:
      "Goals with a deadline, a verification rule, and a stake you choose.",
    group: "Using Bondline",
    sections: [
      {
        title: "Choose a clear outcome",
        paragraphs: [
          "A commitment belongs to one creator and one Circle. Write what completion means in advance: ‘Publish the release and link the changelog’ is easier to review than ‘Make progress.’ The current form accepts descriptions up to 280 characters and offers deadlines of one day, three days, one week, or two weeks.",
          "The deadline shown at review is the deadline submitted. It does not move later just because account confirmation takes time. Check it before signing.",
        ],
      },
      {
        title: "Choose a proportionate stake",
        paragraphs: [
          "The creator commits native MON, held by BondlineCore until settlement. Backers do not contribute to that escrow. Fees are separate from the stake. Use an amount you can afford to forfeit; Bondline does not guarantee completion or a financial return.",
        ],
      },
      {
        title: "Choose how completion is proven",
        bullets: [
          "Circle review: submit evidence before the deadline; eligible peers review it during a 24-hour window.",
          "On-chain balance: reach the configured available MON balance and trigger Check progress before the deadline. Temporary balances can qualify; this is not a long-term savings measurement.",
          "GitHub: available only when an external verifier is configured and operated. The rule specifies repository, author, and required commit count. See verification for the trust model.",
        ],
      },
      {
        title: "Read the state",
        bullets: [
          "In progress: the deadline is running and completion has not been verified.",
          "Evidence review: evidence was submitted in time and peers can approve or dispute it.",
          "Completed: successful verification released the stake; a rejected transfer can instead create a withdrawable refund credit.",
          "Missed: the commitment failed and its stake funded the Circle Pot. Expired active or review states may need a settlement action first.",
        ],
      },
      {
        title: "Changing your mind",
        paragraphs: [
          "There is no supported cancellation, stake edit, description edit, or deadline extension after creation. Cancelling before account confirmation is different from cancelling an on-chain commitment. Review carefully before submitting.",
        ],
      },
      {
        title: "Evidence is public",
        paragraphs: [
          "The evidence URI and its hash are emitted on-chain. The hash commits to the URI string, not to every future byte served by that URL. Use stable, accessible evidence and do not include private medical, financial, or personal information.",
        ],
      },
    ],
  },
  circles: {
    title: "Circles",
    description: "A shared place for conversation, goals, and incentives.",
    group: "Using Bondline",
    sections: [
      {
        title: "A group with a purpose",
        paragraphs: [
          "A Circle has a name, member list, approval threshold, and its own on-chain Pot. Use it for a small team, a study group, a training crew, or a personal challenge with friends. Each Circle is a separate contract clone; its funds are not pooled with other Circles.",
        ],
      },
      {
        title: "Joining and invitations",
        paragraphs: [
          "The creator supplies initial member addresses. Existing members can invite additional accounts; invitees must accept later invitations themselves. The current contracts do not implement member removal. Share an account address deliberately and confirm it with your friend.",
          "Adding a member does not change the eligible evidence reviewers for commitments already created. The eligible roster is frozen for each commitment.",
        ],
      },
      {
        title: "Four parts of the workspace",
        bullets: [
          "Chat: the private conversation for authenticated members.",
          "Commitments: active goals, evidence reviews, and settled history.",
          "Members: identities, addresses, and invitation actions.",
          "Pot & rewards: the Circle balance and earned weekly rewards.",
        ],
      },
      {
        title: "Who decides completion?",
        paragraphs: [
          "For Circle review, the creator cannot approve their own evidence. The approval threshold is applied to eligible peers and rounded up, with at least one approval required. Backing a goal before evidence is not a vote on completion.",
        ],
      },
      {
        title: "What funds the Pot?",
        paragraphs: [
          "Failed commitments transfer their stake to their own Circle. In v2 those failed stakes are reserved for weekly rewards. A member cannot redirect reserved rewards through an ordinary Pot payout proposal.",
          "After the deadline week ends and all its commitments settle, each completed commitment earns an equal share of the applicable pool. A member with multiple completions earns multiple shares. Funds from weeks without completions, and rounding dust, roll forward according to the contract’s period-closing logic.",
        ],
        links: [
          { label: "Settlement and reward details", href: "/docs/settlement" },
        ],
      },
      {
        title: "Identity and privacy",
        paragraphs: [
          "Members can set their own display name and avatar. Members can update the Circle’s mission, Pot goal, and banner. These display fields and uploaded images are public. Group conversation is membership-protected but is not end-to-end encrypted.",
        ],
      },
    ],
  },
  cosigning: {
    title: "Backing & evidence review",
    description:
      "Encouragement and settlement approval are two different actions.",
    group: "Using Bondline",
    sections: [
      {
        title: "Back them",
        paragraphs: [
          "Backing says you believe a member will follow through. It is available while the commitment is active and before the deadline. You can back each commitment once, cannot back your own, and must be a Circle member. Your backing remains recorded when evidence is later reviewed.",
          "Backing does not risk a stake, send money to the creator, approve future evidence, or settle funds. It is an on-chain action, so a transaction fee applies.",
        ],
      },
      {
        title: "Approve evidence or dispute it",
        paragraphs: [
          "After evidence is submitted, eligible peers review the actual outcome. Approving counts toward the frozen threshold; disputing counts against it. A peer can respond once. You may back a friend beforehand and still dispute inadequate evidence later.",
          "Reaching the approval threshold can settle success immediately. When objections make that threshold unreachable, failure can settle immediately. Otherwise, an expired review window can be settled; an unmet threshold means failure.",
        ],
      },
      {
        title: "Your money",
        paragraphs: [
          "The commitment creator’s escrow is at stake. A reviewer’s own funds are not put at risk by approving or disputing evidence, apart from the fee for submitting that response. Circle rewards are not a payment for a particular vote.",
        ],
      },
      {
        title: "Review responsibly",
        bullets: [
          "Read the goal and evidence before approving.",
          "Do not assume backing already counted as approval.",
          "A newly added member may be in the Circle but outside an older commitment’s eligible roster.",
          "If the interface says you already reviewed, another review is not needed.",
          "External and balance verifications use their configured rule instead of a Circle vote.",
        ],
      },
    ],
  },
  verification: {
    title: "Verification",
    description:
      "Know exactly what your completion rule proves—and what it does not.",
    group: "Using Bondline",
    sections: [
      {
        title: "Circle evidence review · available",
        paragraphs: [
          "Peer review supports outcomes that friends can reasonably judge, such as a run log, a study summary, or a published project. This is human judgment, not independent proof of every claim. Choose reviewers you trust and agree on evidence in advance.",
        ],
      },
      {
        title: "On-chain balance · available",
        paragraphs: [
          "Bondline checks the creator’s available native MON balance against a target stored at creation. Anyone can trigger the check before the deadline. A failed check does not by itself forfeit the commitment; the creator can reach the target and retry before the deadline.",
          "The stake has already left the available balance. This method does not lock savings, distinguish borrowed funds, verify income, or measure how long a balance has been held.",
        ],
      },
      {
        title: "GitHub · configuration required",
        paragraphs: [
          "The repository includes a trusted external worker for public GitHub commits. It checks a fixed repository, author, default branch, and commitment interval. It counts unique commit hashes and does not prove that the commitment creator owns the author’s GitHub account.",
          "A funded verifier must be authorized in the contract, fixed when the commitment is opened, and run reliably before success deadlines. The form hides this method when no verifier address is configured. An API error is not automatically a verified failure.",
        ],
      },
      {
        title: "Planned categories",
        bullets: [
          "Fitness providers: no wearable or fitness API integration is live.",
          "Learning providers: no course platform integration is live.",
          "Custom external signals: the attestation contract path exists; provider integrations need implementation and explicit trust review.",
          "A Chainlink CRE GitHub workflow and a separate production receiver are included in the repository. They are not deployed or operating on the current public app. The Node worker remains a separate option; do not describe it as CRE execution.",
        ],
        links: [
          {
            label: "CRE overview from Chainlink",
            href: "https://docs.chain.link/cre/overview",
          },
        ],
      },
      {
        title: "What if a provider fails?",
        paragraphs: [
          "Do not create provider-verified goals unless the required worker is operating. External success must be submitted before the deadline. Contract expiry rules still apply if a worker does not attest; there is no promise of a manual operator override or compensation. Inspect the configured rule before staking.",
        ],
      },
    ],
  },
  settlement: {
    title: "Settlement & Circle Pot",
    description:
      "Understand the successful path, failed path, and weekly reward rules.",
    group: "Using Bondline",
    sections: [
      {
        title: "Successful completion",
        paragraphs: [
          "The core marks the commitment completed before releasing its escrow. Circle approvals or a valid automatic check can trigger this. If the recipient rejects the transfer, a refund credit is recorded instead of blocking settlement. Receive that credit from your profile; the contract supports withdrawing to another payable address.",
        ],
      },
      {
        title: "Failure and expired states",
        paragraphs: [
          "If evidence is never submitted before the deadline, anyone can settle the missed commitment. If the review window expires below the threshold, anyone can settle failure. Objections can settle failure sooner when success becomes mathematically impossible.",
          "The failed stake is sent to the commitment’s Circle and recorded for the week determined by its deadline. Gas is paid by whoever submits settlement. These rules do not depend on a Bondline staff member deciding which users deserve a refund.",
        ],
      },
      {
        title: "Weekly rewards",
        paragraphs: [
          "A period is 604,800 seconds, aligned to Unix-epoch weeks rather than local calendar weeks. A period must end and have no pending commitments before it closes. The pool is split equally per completed commitment; a member’s share is proportional to their completions in that period.",
          "Claiming can close a ready period automatically. Each member claims once per period. A week without successes allocates no immediate rewards; remaining funds and integer-rounding dust roll into the current open period according to the contract. A displayed Circle balance can include multiple reserved periods, not just your claimable amount.",
        ],
      },
      {
        title: "What the operator can change",
        paragraphs: [
          "Core settlement code is not an upgradeable proxy. The deployment administrator can manage the external-verifier trust registry. Registry changes affect which external verifiers can be selected when opening commitments; commitments bind to their configured attestor. This is a trust boundary, not an independent decentralized oracle guarantee.",
          "The website, metadata, and indexing service can change or become unavailable. The contract address and explorer remain the place to inspect on-chain rules and outcomes.",
        ],
        links: [
          { label: "Deployment details", href: "/docs/contracts" },
          { label: "Security considerations", href: "/docs/security" },
        ],
      },
    ],
  },
  reliability: {
    title: "Reliability history",
    description: "A record of follow-through, not a credit score.",
    group: "Using Bondline",
    sections: [
      {
        title: "Your metrics",
        bullets: [
          "Completed: commitments settled successfully.",
          "Missed: commitments settled as failed.",
          "Completion rate: completed ÷ (completed + missed), rounded to a whole percentage. Unsettled commitments are excluded; an empty settled history shows a dash, not a made-up rating.",
          "Completion streak: consecutive settled successes ordered by deadline, stopping at the most recent failure. It is not a daily activity streak.",
          "Total committed: all stakes recorded for your commitments, including settled ones. It is not your current account balance.",
          "Unique supporters: distinct accounts recorded as supporting the creator; backing and evidence approvals can contribute without double-counting the same supporter.",
          "Circles: the groups your current address belongs to.",
        ],
      },
      {
        title: "What the record means",
        paragraphs: [
          "The profile reflects commitments recorded by one blockchain account. It does not establish the identity of a real person, account ownership across devices, work quality, or financial creditworthiness. A new passkey creates a separate account and history.",
          "Goals and stakes vary between people. A high completion rate is not a verified hiring credential, underwriting score, or a guarantee of future performance. Use it as context for your own progress.",
        ],
      },
      {
        title: "Public history",
        paragraphs: [
          "Commitment creation, backing, evidence URIs, and settlements are public on-chain. Removing your display profile does not delete the underlying record. Choose descriptions and evidence that you are comfortable making public.",
        ],
      },
    ],
  },
  security: {
    title: "Security & trust model",
    description:
      "Concrete guarantees, explicit trust boundaries, and known risks.",
    group: "Trust",
    sections: [
      {
        title: "Contract security",
        paragraphs: [
          "The deployed v2 contracts have not undergone an independent security audit. The repository includes lifecycle, access-control, accounting, and reentrancy tests, but tests are not an audit. Smart-contract bugs, validator or infrastructure failures, and loss of signing access remain possible.",
          "Commitment escrow is held by BondlineCore. Each Circle has a separate Pot contract. Contract accounting reserves failed stakes for rewards; arbitrary payout voting cannot consume those reserved funds. Fund-moving paths use reentrancy protection and finalize accounting before external transfers.",
        ],
      },
      {
        title: "Account security",
        paragraphs: [
          "Mera’s WebAuthn PRF output derives the same secp256k1 account when the same passkey is used. Bondline stores credential metadata, not a persistent signing key, in browser storage. Derived buffers are cleared where possible and the short-lived signing session ends after use. JavaScript memory clearing is not a formal guarantee against a compromised device or browser.",
          "There is no Bondline-operated key recovery or custody service. Passkey sync and recovery depend on your provider. Losing the credential can lose access to funds. A different origin or relying-party configuration may prevent use of an existing passkey; use the stable production domain.",
        ],
      },
      {
        title: "Private app features",
        paragraphs: [
          "The server verifies a signed nonce challenge before issuing a seven-day HttpOnly session cookie. Chat requests check current on-chain Circle membership. Profile and Circle changes are authorized server-side; database administrator keys are not sent to the browser.",
          "Chat is access-controlled, not end-to-end encrypted. Project operators and database infrastructure can access stored messages. Display images, profiles, and Circle metadata are public. Do not upload sensitive content. A PRF-encrypted private journal is not implemented.",
        ],
      },
      {
        title: "Verification and operations",
        paragraphs: [
          "Circle-reviewed outcomes depend on peers. External verification depends on the configured attestor and its data source. The administrator controls the external-verifier registry. The indexer and website improve access to information but do not replace contract authority.",
          "Expired commitments may need a transaction to settle. The indexer’s scheduled job is not a universal settlement or verifier scheduler.",
        ],
      },
      {
        title: "Reporting a problem",
        paragraphs: [
          "Use Contact for the configured support channel. Public GitHub issues are suitable for general bugs, but never publish an exploitable vulnerability, private key, provider secret, or private conversation there. If no private reporting address is configured, first ask the maintainers for a private channel without disclosing details.",
        ],
        links: [
          { label: "Contact Bondline", href: "/contact" },
          { label: "Privacy notice", href: "/privacy" },
        ],
      },
    ],
  },
  developers: {
    title: "Developer architecture",
    description:
      "The application, contracts, identity boundary, and event pipeline.",
    group: "Developers",
    sections: [
      {
        title: "System map",
        code: "Browser / Next.js UI\n  ├─ Mera passkey → short-lived signing account → Monad\n  ├─ wagmi + viem → contract reads and confirmations\n  └─ signed app session → Next.js social API → Supabase\n\nMonad events → Envio HyperSync (or RPC)\n  → resumable Next.js indexer → atomic Supabase projections\n  → dashboard / Circle snapshots and public activity\n\nOptional GitHub worker → trusted on-chain attestation\nPlanned: CRE orchestration; encrypted private journal",
      },
      {
        title: "Contracts and events",
        paragraphs: [
          "BondlineCore owns escrow, verification, evidence voting, settlement, and reward accounting. CircleFactory creates and registers Circle clones. Each Circle contains its own member list, invitation state, threshold, and Pot.",
          "The ABI retains Bond terminology and the existing status enum. Product copy uses commitment. Do not reinterpret a CommitmentBacked event as a Cosigned evidence approval. Membership events from Circle clones are decoded only against known selectors so clone initialization does not block ingestion.",
        ],
        links: [
          { label: "Contracts & event catalog", href: "/docs/contracts" },
        ],
      },
      {
        title: "Envio indexing",
        paragraphs: [
          "The application consumes Envio HyperSync through an HTTP event ingestion path; it is not a deployed HyperIndex/Envio Cloud project. RPC transport is the fallback. The indexer scans an explicitly configured chain, deployment block, and finality margin, records finalized logs, and builds queryable projections.",
          "Atomic ingestion and a per-chain advisory lock prevent cursor advancement without applied events. Replayed and overlapping batches are safe no-ops; unknown housekeeping logs are filtered before strict event decoding. Contract reads remain the authority for actions and rewards.",
        ],
        links: [
          {
            label: "Envio HyperSync documentation",
            href: "https://docs.envio.dev/docs/HyperSync/hypersync-clients",
          },
        ],
      },
      {
        title: "Verifier architecture and CRE status",
        paragraphs: [
          "scripts/verifier.mjs validates immutable GitHub specs, queries a bounded GitHub API response, hashes evidence, and can submit attestations from an authorized account. Configuration is worker-only; the frontend only receives the verifier address. --broadcast is an explicit spending action.",
          "There is no CRE workflow in this repository. A future CRE implementation would need its own triggers, source validation, consensus and attestation design, supported chain setup, credentials, simulations, and operational deployment. Do not relabel the existing Node worker as CRE.",
        ],
        links: [
          { label: "Verification guide", href: "/docs/verification" },
          {
            label: "Chainlink CRE documentation",
            href: "https://docs.chain.link/cre/overview",
          },
        ],
      },
      {
        title: "Mera and PRF",
        paragraphs: [
          "mera.ts creates or opens a PRF-enabled passkey, derives m/44'/60'/0'/0/0 through the pinned Mera/scure stack, opens a signing session, and closes it in finally. During connection the same session signs the server authentication challenge. Transaction signing prepares chain, gas, nonce, fees, and funding requirements before the ceremony.",
          "No Mera app ID is required by the integration used here. RP_ID defaults to the current hostname; coordinate changes with existing credentials. PRF material is currently used for signing-account derivation only. There is no encrypted journal schema or application key separation implementation.",
        ],
      },
      {
        title: "Local development",
        code: "cd web\npnpm install --frozen-lockfile\ncp .env.example .env.local\n# Fill in your deployment and social-service values.\npnpm dev\n\npnpm typecheck\npnpm test\npnpm build\n\n# From the repository root:\nforge test --root contracts --offline",
        links: [{ label: "Environment setup", href: "/docs/environment" }],
      },
      {
        title: "Database and jobs",
        paragraphs: [
          "For a new dedicated v2 database, run supabase/bootstrap-v2.sql once. It includes the schema and the required ingestion changes; do not blindly reapply older initialization files over an active deployment. Existing databases need reviewed migrations, not a destructive reset.",
          "Configure the database’s scheduled indexer using supabase/schedule-indexer.sql and the matching server-side secret. Run pnpm indexer:backfill from web to catch up. Scheduler installation does not repair wrong API credentials, schema mismatch, or a decoder error. Verify HTTP responses and the finalized cursor.",
          "The GitHub verifier needs a separate recurring process. The indexer cron does not run it. Prefer one chain/deployment database until projections are explicitly namespaced for multiple deployments.",
        ],
      },
    ],
  },
  environment: {
    title: "Environment & deployment",
    description:
      "A reproducible setup without exposing service or signing secrets.",
    group: "Developers",
    sections: [
      {
        title: "Public application configuration",
        bullets: [
          "NEXT_PUBLIC_CHAIN_ID: 10143 for the documented v2 testnet deployment; 143 means mainnet.",
          "NEXT_PUBLIC_PROTOCOL_VERSION: 2 for the current contracts.",
          "NEXT_PUBLIC_CORE_ADDRESS and NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS: from the matching deployment manifest.",
          "NEXT_PUBLIC_MONAD_RPC_URL: an RPC for the same chain as the addresses.",
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY: the public project URL and publishable/anonymous key.",
          "NEXT_PUBLIC_SITE_URL: the stable public origin for metadata and sharing; defaults to the current Vercel domain.",
          "NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_SOCIAL_URL: optional real public contact channels.",
          "NEXT_PUBLIC_GUIDANCE_VIDEO_URL: optional HTTPS URL for a completed product recording. Until configured, guide links use the written walkthrough.",
          "NEXT_PUBLIC_MERA_RP_ID: optional stable relying-party domain. Do not change existing passkeys’ scope casually.",
          "NEXT_PUBLIC_ENABLE_EXTERNAL_WALLET: false to omit the optional injected wallet path.",
        ],
      },
      {
        title: "Server-only secrets",
        bullets: [
          "SUPABASE_SERVICE_ROLE_KEY: the configured project’s legacy service-role credential used by the server. A publishable key cannot replace it.",
          "BONDLINE_SESSION_SECRET: a random secret of at least 32 characters, used to sign app session cookies.",
          "MONAD_RPC_URL: server reads must use the same chain as the frontend.",
          "BONDLINE_INDEXER_SECRET or CRON_SECRET: authenticates the indexer run endpoint. Use a distinct random secret.",
          "HYPERSYNC_BEARER_TOKEN and BONDLINE_HYPERSYNC_URL: optional HyperSync transport configuration.",
          "BONDLINE_DEPLOYMENT_BLOCK and indexer range/finality options: configure the cursor and scan bounds.",
          "BONDLINE_VERIFIER_PRIVATE_KEY and GITHUB_VERIFIER_TOKEN: optional worker-only secrets. Never expose them to the browser.",
        ],
      },
      {
        title: "Production setup",
        paragraphs: [
          "The Vercel project’s root directory is web. Set environment variables for the intended deployment target, then rebuild. Changing Vercel environment values does not update your local .env.local, and existing builds do not automatically receive changed public values.",
          "Apply the matching database schema, set a Vault secret matching the indexer secret, install the scheduled job, and verify a successful backfill and cursor advancement. Enable GitHub verification only after the authorized worker is funded and scheduled.",
          "Keep .env files, private keys, service credentials, and local planning documents out of Git and deployment snapshots.",
        ],
      },
      {
        title: "Contract deployment",
        paragraphs: [
          "The public testnet manifest is docs/deployments/monad-testnet.json. contracts/script/Deploy.s.sol creates and connects the core and factory. Check the target chain and the deployer’s balance before broadcasting. Use the Makefile and contract README to inspect the actual commands; do not run a mainnet target accidentally.",
          "After deployment, verify source on the configured explorer, record receipts and deployment block, update addresses as one set, and start the indexer from that block. This guide does not authorize deploying a new contract or spending an account’s funds.",
        ],
      },
    ],
  },
  contracts: {
    title: "Contracts & events",
    description:
      "Published addresses, exact accounting boundaries, and the event model.",
    group: "Developers",
    sections: [
      {
        title: "Current deployment",
        paragraphs: [
          "The current v2 public manifest targets Monad testnet, chain ID 10143, starting at block 70697469. Deployment addresses below are from that manifest, not a claim that a new v2 mainnet release has happened.",
        ],
        code: "BondlineCore\n0x7b37d3be163f10af7662e083709aea9102530823\n\nCircleFactory\n0x27c527934b115e64eed61c5f783a1060b540a6c4\n\nCircle implementation\n0xb96f540bf5df893a06670705dc43f40cfc75ada6",
        links: [
          {
            label: "Public deployment manifest",
            href: "https://github.com/Psalmuel01/bondline/blob/main/docs/deployments/monad-testnet.json",
          },
        ],
      },
      {
        title: "Important entry points",
        bullets: [
          "openBond / openVerifiedBond: escrow a new commitment with its frozen reviewers and verifier rule.",
          "backCommitment: record encouragement independently of evidence voting.",
          "declareDone / cosign / object: submit evidence and record peer responses.",
          "verifyBalance / attest: apply the selected automatic or trusted external rule.",
          "resolveExpired / crossMissed: settle expired commitments without a privileged operator.",
          "closePeriod / claimReward: close a ready deadline week and distribute reserved rewards.",
          "withdrawRefund: receive a credited refund to a payable address.",
          "invite / join: issue and accept later Circle invitations.",
        ],
      },
      {
        title: "Event catalog",
        bullets: [
          "CircleCreated, MemberInvited, CircleJoined: group membership and invitations.",
          "BondOpened, VerificationConfigured: commitment creation and completion rule.",
          "CommitmentBacked: social encouragement, never evidence approval.",
          "BondDeclared, Cosigned, Objected: evidence review and peer decisions.",
          "CommitmentVerified, BondResolved, RefundCredited: outcome and returned-stake accounting.",
          "PotPeriodClosed, PotRewardClaimed: weekly pool closure and claims.",
          "PayoutProposed, PayoutCosigned, PayoutExecuted: legacy/unreserved payout proposal path.",
          "TesterJoined: explicit evaluation enrollment, not proof of a unique real human.",
        ],
      },
      {
        title: "Indexing and compatibility",
        paragraphs: [
          "Keep strict ABI decoding for recognized events. Filter housekeeping logs before decoding Circle membership. Every event projection is scoped to the configured chain and cursor. Numeric values can exceed JavaScript’s safe integer range; the snapshot path preserves amounts as strings/BigInt.",
          "Legacy v1 mainnet addresses exist in repository history. Their Pot governance differs from v2 reserved weekly rewards. Do not mix chain IDs, old deployments, or database cursors.",
        ],
      },
      {
        title: "Source and audit status",
        paragraphs: [
          "See contracts/src and contracts/test for implementation and tests. These contracts are not independently audited. UI wording is explanatory; the deployed bytecode and ABI determine behavior.",
        ],
        links: [
          {
            label: "Contract source",
            href: "https://github.com/Psalmuel01/bondline/tree/main/contracts/src",
          },
          { label: "Security guide", href: "/docs/security" },
        ],
      },
    ],
  },
  "private-journal": {
    title: "Private journal",
    description:
      "Personal reflections encrypted with the same Mera passkey, using a separate PRF-derived encryption key.",
    group: "Trust",
    sections: [
      {
        title: "Write privately",
        paragraphs: [
          "Open Private journal from your account menu or Settings. Passkey accounts can create a journal, add reflections, edit or delete entries, and encrypt and save them. Browser-wallet accounts continue to use Circles and commitments; this journal requires Mera’s passkey PRF.",
          "Nothing in a journal is posted to Circle chat, commitment evidence, or the blockchain. No gas is needed. Unsaved changes stay in the current page’s memory; save before navigating away.",
        ],
        links: [{ label: "Open your journal", href: "/journal" }],
      },
      {
        title: "Encryption and storage",
        paragraphs: [
          "Bondline uses Mera’s createSecretVaultWithExistingPasskey and decryptSecretVaultWithPasskey APIs. Each save uses a fresh random 32-byte PRF salt and a fresh 12-byte AES-GCM nonce. Mera derives a non-extractable AES-256-GCM key with HKDF-SHA-256 and its encryption-specific info string, distinct from the wallet signing derivation.",
          "Only the encrypted vault is stored in browser storage. Titles, text, and entry timestamps are inside the ciphertext. Backup metadata includes the account address, chain ID, passkey domain, credential identifier, salt, and nonce. Plaintext is held in memory while open; an unlocked page, compromised device, or malicious application script could access it. This is encryption at rest, not a claim of an audited end-to-end privacy system.",
        ],
      },
      {
        title: "Lock and recover",
        paragraphs: [
          "Saved notes lock when this page is hidden. Unsaved edits stay open so changing tabs does not silently destroy a draft; explicitly lock to discard them. Signing out or changing accounts clears the open journal.",
          "Export an encrypted backup after saving. Import on the same passkey domain, network, and account; the original passkey must still be available. Import decrypts and validates the file before replacing saved data. There is no custody backend, automatic cloud backup, reset service, or recovery phrase. Losing the passkey can make notes permanently unreadable. Clearing browser storage without a backup deletes this device’s journal.",
        ],
      },
      {
        title: "Limits and tests",
        paragraphs: [
          "The journal supports up to 100 reflections, 120-character titles, and 8,000-character bodies. Backups are bounded to 2 MB. Tests exercise the real Mera vault APIs using an isolated authenticator fixture: encryption/restore, fresh salts and nonces, tamper rejection, credential binding, account/network/domain boundaries, and malformed entries. Actual biometric and multi-device recovery must still be checked on the devices you intend to use.",
        ],
      },
    ],
  },
};
