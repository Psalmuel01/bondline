# Shipstake

**Put money behind your word. Let the chain enforce your deadline.**

Shipstake turns a deadline into an on-chain object. You escrow MON behind a promise and name a witness who can vouch that you shipped. Ship in time and your witness refunds you. Miss the deadline and *anyone* can move your stake to a beneficiary you'd rather not fund. No nagging, no willpower — just a countdown that resolves itself.

Built for the **Spark** hackathon on **Monad** (testnet, chain `10143`).

---

## Why this exists

Every promise with a deadline — grant milestones, contributor bounties, your own side projects — relies on willpower or someone chasing you. There is no neutral thing that just *enforces the deadline*. Shipstake is that thing: the smallest possible primitive that makes a deadline financially and socially real.

The author is carrying five overlapping funded deadlines right now (Privara, Shade, Lucent, VeilDrop, plus audit work). Those are the seed commitments live on the feed — this isn't placeholder data, it's the author's actual month on the line.

---

## The one feature, and it's real

A full commitment lifecycle, executing on-chain, that you can drive yourself in under 3 minutes:

1. **Create** a commitment with a **2-minute demo deadline** and a small stake.
2. Either **the witness vouches** before the deadline → stake refunds, live; **or**
3. The deadline passes and **anyone clicks `claimForfeit`** → stake moves to the beneficiary, live.

Every action shows its transaction on the Monad explorer. Nothing is faked, nothing is optimistic — the UI reflects on-chain state only.

---

## Run it in 3 minutes

### Try the live app
- **App:** _<add your hosted URL>_
- **Contract:** _<add deployed address>_ (verified on MonadVision)
- Connect an injected wallet (MetaMask), switch to Monad Testnet, grab test MON from https://faucet.monad.xyz, and make a commitment with the **2-min** preset.

### Run the contract tests locally
```bash
cd contracts
forge test -vv
```
Expected: **20 passing** — both resolution paths, every revert, reentrancy on both fund-out paths, and a fuzz test on forfeit.

### Run the frontend locally
```bash
cd web
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_VAULT_ADDRESS to the deployed contract
pnpm dev                     # http://localhost:3000
```

---

## Architecture

One contract. The entire trust surface fits on one screen.

```
contracts/src/ShipstakeVault.sol   ~145 lines, ReentrancyGuard + checks-effects-interactions
contracts/test/ShipstakeVault.t.sol  20 tests incl. reentrancy attackers + fuzz
web/                                 Next.js + wagmi/viem, dark "countdowns" UI
```

**`ShipstakeVault`** is a single vault holding all stakes under internal accounting (`mapping(id => Commitment)`), rather than deploying a contract per commitment — far cheaper on gas, and Monad's throughput makes it the obvious default.

- `createCommitment(description, deadline, witness, beneficiary)` payable — escrows MON.
- `markComplete(id)` — witness-only, before deadline → refunds the creator.
- `claimForfeit(id)` — permissionless, after deadline, if unconfirmed → sends stake to the beneficiary.

### Design decisions worth noting
- **Witness ≠ creator** is enforced on creation. You can't vouch for yourself.
- **Silence defaults to forfeiture, never deadlock.** A witness who goes dark can't trap your stake — the deadline itself is the fallback.
- **Forfeit funds always go to the beneficiary, never the caller.** `claimForfeit` is permissionless by design, so there's no MEV race to win — only the promise being kept or not.
- **Stake is retained as the historical record** after resolution; the `status` enum is the sole state machine, and the `NotActive` guard makes any second payout impossible. This keeps the resolved-history feed honest ("0.5 MON — FORFEITED") instead of showing zeros.
- **Description is stored on-chain as plain text**, not an IPFS hash. At this scale, legibility beats an off-chain dependency that could fail during a 3-minute judge run.

---

## Deploy

```bash
cd contracts
cp .env.example .env          # set PRIVATE_KEY (testnet key only)
source .env
forge script script/Deploy.s.sol \
  --rpc-url monad_testnet --broadcast \
  --verify --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/
```

---

## Scope

This is the Tier-0 MVP: the core primitive, done well. Deliberately **out of scope** for the hackathon (see the roadmap in `docs/`): milestones, multi-witness quorum, a reputation SBT, dispute windows, auto-verification oracles, and the spectator prediction-market layer. One real working feature over several fake ones.

## Security

It's an escrow contract, so it's written like one: ReentrancyGuard on both state-changing external calls, checks-effects-interactions ordering (state finalized before any transfer), and reentrancy attacker contracts in the test suite proving a double-payout reverts. Core vault logic is immutable — no upgradeable proxy over user funds. This is a 2-day build and has not been formally audited; it runs on testnet with test MON.
