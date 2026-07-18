# Bondline — Product Requirements Document

**A group commitment protocol for crews who hold each other to their word.**
Author: Samuel Dahunsi · Draft v2 · Monad

> This is the full product vision. The hackathon build is **Tier 0** only (see §4).
> Everything above Tier 0 is the post-hackathon roadmap.

---

## 1. Vision

Builders, researchers, and friend groups constantly make promises with no enforcement mechanism beyond willpower and reputation. Deadlines slip quietly, milestones stretch, and nobody outside your own head ever really knows whether you did the thing you said you'd do.

Bondline turns a deadline into a financial and social object your crew enforces. You form a *pod* with people who'd actually know whether you shipped, stake money behind your own deadline, and let the group vote on the outcome instead of your conscience. Hit it and the group refunds you. Miss it and the stake pools into a shared fund the group later spends together — your individual misses literally fund the group's next thing.

The wedge is personal (a builder living through several overlapping deadlines, with friends who'd know). The ceiling is a general-purpose group-accountability primitive: savings pods, training groups, contributor collectives, and grant cohorts could all run on it.

---

## 2. Problem

**Personal version:** You're carrying several funded workstreams with no single mechanism forcing prioritization other than self-discipline. Missed internal deadlines have no cost, and nobody notices until it's too late. A lone reminder app can't apply real pressure, and a single witness is a weak, gameable enforcer.

**Market version:** Every accountability group faces the same gap at scale — running clubs, writing groups, grant cohorts, DAO contributor pods. They rely on manual check-ins and social pressure with no neutral, automated "you said you would, now the group decides, and there's money on it" primitive. The shift from *one witness* to *a pod with a tunable threshold* is what makes the enforcement both robust (no single point of failure/collusion) and social (the pot is shared).

---

## 3. Personas

- **The Pod Member (you):** In a small trusted crew, juggling real deadlines, wanting pressure sharper than a calendar reminder and a group that shares the upside of the misses.
- **The Pod:** A fixed group of friends/collaborators who vote on each other's claims and jointly control the shared fund. Their collective judgment *is* the oracle.
- **The Group Treasurer (emergent):** Any member who proposes spending the pooled forfeits — a trip, a dinner, a donation — subject to the same group vote.
- **The Grant Cohort (future):** A batch of funded builders who form a pod so their milestone misses fund a shared pool, with the program as an optional member.

---

## 4. Feature Tiers

### Tier 0 — MVP (weekend build) ← THIS HACKATHON
- **Create a pod:** name, member set (fixed at creation), tunable approval threshold (bps). Deploys as its own isolated vault (EIP-1167 clone).
- **Stake a commitment** inside a pod: description, deadline, MON stake.
- **Declare complete** before the deadline with a hashed evidence link → opens a vote window.
- **Group voting** on claims, with early-approve and early-reject the instant the outcome is decided; expiry and never-declared both forfeit to the pod.
- **Shared fund + group withdrawals:** forfeited stakes pool per pod; any member proposes a payout, the same threshold approves, it executes.
- **Multi-pod dashboard** with live countdowns and per-member vote status.

### Tier 1 — V1 (post-hackathon hardening)
- **Milestone commitments:** N sequential milestones per commitment, each with its own sub-stake and deadline.
- **Time-locked fallback thresholds:** a pod can require unanimity for 30 days, then decay to a majority, so one unresponsive member can't freeze a fund forever.
- **Reputation SBT:** every resolved commitment mints a non-transferable badge — a portable "I ship" credential and a per-member ship-rate within each pod.
- **Mutable membership:** add/remove members by group vote, rather than the fixed-at-creation set.

### Tier 2 — Ecosystem layer
- **Grant-native pods:** a program joins a cohort pod as a member (or the fund's beneficiary), so milestone misses route into a shared pool the program co-governs.
- **Auto-verification oracles:** for checkable artifacts (a GitHub tag, a verified deploy, a URL returning 200), an optional oracle can cast a "yes" vote so humans only adjudicate the ambiguous cases.
- **Dispute window:** a short challenge period after a claim resolves, during which a member can post a bond to force a re-vote.

### Tier 3 — Moonshot / social layer
- **Spectator markets:** people outside a pod can back or fade a public commitment before its deadline.
- **Streaming stakes:** stream part of the stake back as verifiable partial progress lands.
- **Cross-pod / cross-chain:** commitments created on Monad resolved against proof on another chain via a message layer.

---

## 5. Core Mechanics (Deep Dive)

**Pod lifecycle:** `createPod(members, threshold) → PodFund clone` — fixed membership, immutable threshold, its own MON balance.

**Commitment lifecycle:** `Active → PendingVote → {Completed | Forfeited}`
- `Active`: staked, deadline running, not yet declared.
- `PendingVote`: creator declared before the deadline; vote window (24h) open.
- `Completed`: yes-votes cleared the threshold → creator refunded.
- `Forfeited`: vote rejected/lapsed under the bar, or deadline passed with no declaration → stake to the pod fund.

**Entities:**
- `Pod` (PodFund clone): members[], approvalThresholdBps, balance.
- `Commitment`: id, creator, pod, stake, deadline, voteClosesAt, status, yes/no votes, evidenceHash, evidenceUri.
- `Proposal`: pod, to, amount, approvals, executed, memo — a group withdrawal from the shared fund.

**Threshold math (one source, shared):** `requiredApprovals = max(1, ceil(eligibleVoters × bps / 10000))`. Eligible voters = pod size − 1 for a commitment (creator can't self-vote); full membership for a withdrawal.

**Key incentive design:** what stops a creator naming a friendly pod that always confirms? The pod is fixed and small, the threshold is public, and every member shares the forfeit pool — so waving through a false claim is voting to *not* fund your own group. Collusion is possible but self-limiting: the people rubber-stamping are the people paying for it.

---

## 6. Smart Contract Architecture

```
BondlineMath.sol      → pure threshold/approve/reject math, shared everywhere.   [BUILT]
BondlineVault.sol     → single vault: all commitments, votes, proposals.         [BUILT]
PodFund.sol           → per-pod clone: membership, threshold, shared balance.     [BUILT]
PodFundFactory.sol    → EIP-1167 clone deployer + pod registry.                  [BUILT]
ReputationSBT.sol     → ERC-5192-style badge minted on resolution.               (V1)
DisputeModule.sol     → bond-based re-vote flow.                                 (V2)
```

The vault holds all funds and voting state under internal accounting; each pod is its own clone so balances are physically isolated (a bug against one pod can't drain another). Only the vault may move a pod's money. Monad's throughput makes the single-vault + per-pod-clone split cheap and obvious.

---

## 7. Security Considerations

- **Reentrancy** on the refund and forfeit paths: checks-effects-interactions + ReentrancyGuard, with attacker contracts in the suite proving a double-payout reverts. [DONE]
- **No trapped stakes:** three permissionless resolution paths (decisive vote auto-resolves, `resolveExpired` for a lapsed vote, `forfeitMissed` for a never-declared deadline) guarantee every stake can always be settled. [DONE]
- **Per-pod fund isolation:** pods only accept vault calls; the vault credits forfeits to the owning pod only; tests assert cross-pod balances are untouched. [DONE]
- **Front-running resolution:** resolution is permissionless and pays the creator or the pod, never the caller — no MEV race. [DONE]
- **Collusion / friendly pods:** can't be fully prevented on-chain; the shared-pool incentive and (V1) reputation make it costly. Creator-can't-vote is enforced today. [PARTIAL]
- **Unresponsive members freezing a fund:** real Tier-0 limitation; V1 time-locked fallback thresholds address it. [KNOWN]
- **Upgradeability:** immutable core logic; no proxy over user funds beyond the standardized minimal-proxy clones.

---

## 8. UX Flows

1. **Create pod:** connect → name → add member addresses → pick threshold (live sentence spells out the bar) → deploy.
2. **Stake:** open a pod → describe → pick a deadline preset → stake MON.
3. **Declare:** creator clicks "I shipped it," attaches an evidence link → vote opens.
4. **Vote:** pod members see the live tally with member avatars lighting up as votes land; resolves the instant it's decided.
5. **Spend the pool:** any member proposes a withdrawal with a memo; approvals accrue; it executes at threshold.

---

## 9. Tech Stack

- **Contracts:** Solidity, Foundry (fuzzing + reentrancy attackers), OpenZeppelin (ReentrancyGuard, Clones, Initializable; ERC-5192 base for the SBT later).
- **Frontend:** Next.js, wagmi/viem, a dark "countdowns and pods" identity, live vote panels driven by on-chain events.
- **Offchain storage (V1+):** IPFS/Arweave for evidence blobs — deferred; Tier 0 stores the description on-chain and the evidence as a hashed URI.

---

## 10. Metrics That Would Matter

- Pods created; members per pod; commitments per pod.
- % completed vs forfeited; per-member ship rate.
- Total value staked, forfeited, and withdrawn from shared funds.
- Vote participation rate (are pods actually adjudicating, or rubber-stamping).

---

## 11. Roadmap

- **Phase 0 (this hackathon):** Tier 0 MVP — pods, staking, group voting, shared-fund withdrawals, live and public.
- **Phase 1 (2–4 weeks):** Tier 1 — milestones, reputation SBT, time-locked fallback thresholds, mutable membership.
- **Phase 2 (1–2 months):** Tier 2 — pilot a grant cohort or a real friend-group savings pod.
- **Phase 3 (open-ended):** Tier 3 spectator and cross-chain layers, once Tier 1/2 have real usage.

---

## 12. Open Questions

- MON-only vs arbitrary ERC-20s? (MON-only for the hackathon.)
- Fixed vs mutable membership — how much governance is worth adding before it's overkill for a friend group?
- Should the shared fund support partial/streamed payouts, or stay whole-amount proposals?
- How much off-chain trust is acceptable in an optional oracle voter before it undermines "the group decides"?
