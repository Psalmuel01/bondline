# Shipstake — Product Requirements Document

**A stake-backed commitment protocol for people who ship on deadlines.**
Author: Samuel Dahunsi · Draft v1 · Monad

> This is the full product vision. The hackathon build is **Tier 0** only (see §4).
> Everything above Tier 0 is the post-hackathon roadmap.

---

## 1. Vision

Builders, researchers, and grant recipients constantly make promises with no enforcement mechanism beyond willpower and reputation. Deadlines slip quietly, milestones stretch, and nobody outside your own head ever really knows whether you did the thing you said you'd do.

Shipstake turns a deadline into a financial and social object. You put money behind your word, name a real human who has to vouch for you, and the chain enforces the outcome instead of your conscience. Miss it, and the stake moves automatically to someone you didn't want to have it.

The wedge is personal (you living through five overlapping deadlines right now). The ceiling is a general-purpose accountability primitive that grant programs, DAOs, and hackathons could build on top of.

---

## 2. Problem

**Personal version:** You are simultaneously carrying Privara milestones through mid-September, Shade, Lucent, VeilDrop, and audit work, with no single mechanism forcing prioritization other than self-discipline. Missed internal deadlines have no cost. Nobody but you notices until it's too late.

**Market version:** Every grant program (Stacks, Stellar Community Fund, and similar) faces the same problem at scale: they disburse money against milestones with almost no enforcement besides manual check-ins and trust. DAOs funding contributors face this. Hackathon teams promising post-event follow-through face this. There is no neutral, automated "you said you would, now prove it or pay" primitive that plugs into any of these.

---

## 3. Personas

- **The Solo Builder (you):** Juggles multiple funded workstreams, wants external pressure that's sharper than a calendar reminder.
- **The Witness:** A peer, mentor, or teammate who agrees to verify completion. Has reputational skin in the game too, since a witness who rubber-stamps everything becomes visibly untrustworthy.
- **The Grant Program:** Wants milestone-linked disbursement with less manual overhead and a public, verifiable trail.
- **The Spectator:** Wants to follow public commitments, maybe stake socially, and enjoys the drama of watching someone's deadline countdown live.

---

## 4. Feature Tiers

### Tier 0 — MVP (weekend build) ← THIS HACKATHON
- Create commitment: description, deadline, MON stake, single witness address.
- Witness-only `markComplete()` before deadline, refunds stake.
- Permissionless `claimForfeit()` after deadline if incomplete, sends stake to a chosen beneficiary.
- Public dashboard of live commitments with countdowns.

### Tier 1 — V1 (post-hackathon hardening)
- **Milestone-based commitments:** a single commitment can have N sequential milestones, each with its own sub-stake, mirroring how grants like Privara actually disburse.
- **Multi-witness quorum:** require M-of-N witnesses to confirm, reducing single-point-of-failure or collusion risk.
- **Reputation SBT (soulbound token):** every resolved commitment mints a non-transferable badge, building a public, tamper-proof track record. A portable "I ship" credential that outlives any single hackathon.
- **Witness reputation:** witnesses accumulate their own score based on responsiveness and how often their attestations later get disputed.

### Tier 2 — Ecosystem layer
- **Grant-native mode:** a grant program becomes the beneficiary-of-forfeit and milestone-definer, so programs could issue a commitment alongside a grant award, with disbursement gated by the same contract that would otherwise slash the builder.
- **Auto-verification oracles:** for checkable digital artifacts (a GitHub repo reaching a tag, a contract deployed and verified, a URL returning 200), a lightweight oracle can auto-confirm instead of a human witness.
- **Dispute window:** a short challenge period after a witness confirms, during which anyone can post a bond to contest, escalating to a small arbitration flow.

### Tier 3 — Moonshot / prediction layer
- **Commitment markets:** spectators can back or fade a public commitment before its deadline — a micro-prediction-market on whether you'll ship.
- **Streaming stakes:** stream a portion of the stake back linearly as verifiable partial progress lands.
- **Cross-chain commitments:** a commitment created on Monad but resolved against proof-of-completion on another chain (EVM, Solana, Aleo, Stacks, Stellar) via a message layer.

---

## 5. Core Mechanics (Deep Dive)

**Commitment lifecycle:** `Created → Active → {Completed | Forfeited | Disputed} → Resolved`

**Entities:**
- `Commitment`: id, creator, description, deadline, stake, witnesses[], quorum, beneficiary, milestoneIds[], status.
- `Milestone`: parent commitment id, description, sub-stake, deadline, status.
- `Witness`: address, commitments witnessed, confirm/dispute history.
- `ReputationSBT`: soulbound, minted on resolution, encodes outcome + timestamp + commitment id.

**Key incentive design question:** what stops a creator from naming a friendly witness who always confirms? Two mitigations for V1: (1) witness reputation is public and portable, so a witness who confirms obviously-false completions damages their own score everywhere; (2) the dispute window lets any third party contest a confirmation by posting a bond. This is a social-slashing layer with a cheap escape hatch for obvious abuse, not a trustless oracle.

**Fee model:** a small protocol fee (e.g. 2%) on forfeited stakes only, never on refunds, routed to a public-goods treasury. The protocol only earns when someone fails — worth being upfront about rather than hiding.

---

## 6. Smart Contract Architecture

```
ShipstakeVault.sol   → single vault, internal accounting (mapping id => Commitment).  [BUILT]
WitnessRegistry.sol  → witness reputation tracking                                     (V1)
ReputationSBT.sol    → ERC-5192-style non-transferable badge on resolution             (V1)
DisputeModule.sol    → bond-based challenge flow                                        (V2)
OracleAdapter.sol    → pluggable auto-verification sources                              (V2)
```

A single vault holding all funds with internal accounting is far cheaper on gas than a contract per commitment, and Monad's throughput makes it the obvious default.

---

## 7. Security Considerations

- **Reentrancy** on `claimForfeit`/`markComplete`: checks-effects-interactions + reentrancy guard. [DONE]
- **Front-running `claimForfeit`:** permissionless-after-deadline is intended; funds go to the beneficiary, not the caller, so there's no MEV race. [DONE]
- **Witness griefing:** a silent witness must not lock the stake — the deadline itself is the fallback, so silence defaults to forfeiture, not deadlock. [DONE]
- **Sybil witnesses:** can't be fully prevented on-chain; reputation scoring and dispute bonds make it costly over time (V1+). Creator≠witness is enforced today. [PARTIAL]
- **Upgradeability:** immutable core vault logic; any admin-controlled config (fee %) lives in a separate, clearly-scoped registry, never a proxy over the vault.

---

## 8. UX Flows

1. **Create:** connect → write description → set deadline → set stake → add witness → confirm and deposit.
2. **Witness confirm:** witness gets a link → connects → reviews → confirms.
3. **Public feed:** live grid, countdowns, stake sizes, resolved history for social proof.
4. **Forfeit claim:** anyone triggers post-deadline; UI surfaces a "claimable" button once the timer expires.

---

## 9. Tech Stack

- **Contracts:** Solidity, Foundry (fuzzing), OpenZeppelin (ReentrancyGuard; ERC-5192 base for the SBT later).
- **Frontend:** Next.js, wagmi/viem, a distinctive dark "stakes and countdowns" identity.
- **Offchain storage (V1+):** IPFS/Arweave for evidence blobs — deferred; Tier 0 stores description on-chain.
- **Oracle layer (V2):** start with a trusted relayer for GitHub/URL checks, decentralize later.

---

## 10. Metrics That Would Matter

- Commitments created; % completed vs forfeited.
- Total value staked and forfeited.
- Witness reuse rate (is a reputation graph forming).
- Grant-native mode: whether any real program adopts it for a live milestone.

---

## 11. Roadmap

- **Phase 0 (this hackathon):** Tier 0 MVP, own real commitments live and public.
- **Phase 1 (2–4 weeks):** Tier 1 — milestones, multi-witness, reputation SBT.
- **Phase 2 (1–2 months):** Tier 2 — pitch one real grant program (Stacks or SCF) for a pilot.
- **Phase 3 (open-ended):** Tier 3 prediction layer and cross-chain resolution, once Tier 1/2 have real usage.

---

## 12. Open Questions

- MON-only vs arbitrary ERC-20s? (MON-only for the hackathon, generalize later.)
- How much offchain trust is acceptable in the oracle layer before it undermines the "the chain enforces it" pitch?
- Does the prediction-market layer (Tier 3) carry regulatory complexity the core product doesn't?
