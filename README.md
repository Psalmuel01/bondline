# Bondline

**Stake on your word. Let your crew hold the line.**

Bondline turns a personal deadline into an on-chain object your friends enforce. You start a *pod* with your crew, stake MON against your own deadline, and declare when you've shipped. Enough of the pod confirms it and your stake refunds. Miss the deadline, or fail the vote, and the stake pools into the pod's shared vault — money your own misses hand to the group.

Built for the **Spark** hackathon on **Monad** (testnet, chain `10143`).

---

## Why this exists

Every promise with a deadline — grant milestones, contributor bounties, your own side projects — relies on willpower or someone chasing you. There's no neutral thing that just *enforces the deadline*. Bondline is that thing, but it makes the enforcer your crew instead of a lone witness: the people who'd actually know if you shipped, voting together, with your stake on the line.

The shift from a single witness to a pod is the whole point. One witness is a single point of failure and a coin-flip on collusion. A pod of friends with a tunable approval threshold turns "did you ship?" into a group verdict, and turns everyone's individual misses into a shared pot the group spends together.

---

## How it works

1. **Start a pod** — name it, add your crew's addresses, pick an approval threshold (e.g. 50%). You're auto-included as the first member. The pod deploys as its own isolated vault contract (an EIP-1167 clone).
2. **Stake a commitment** — describe it, set a deadline, escrow MON.
3. **Declare complete** before the deadline, attaching an evidence link (hashed on-chain so it can't be swapped later). This opens the vote.
4. **The crew votes.** The instant *yes* votes clear the pod's threshold, the stake refunds automatically. If *no* votes make the bar unreachable, it forfeits early. If the vote window lapses under the bar — or the deadline passes with no declaration at all — the stake forfeits to the pod. Anyone can trigger the resolution; there's no way to trap a stake.
5. **Spend the pool.** Forfeited stakes collect in the pod's shared fund. Any member proposes a withdrawal; once the same threshold approves, it pays out.

Every action shows its transaction on the Monad explorer. Nothing is faked or optimistic — the UI reflects on-chain state only, and the voting panel lights up each member's avatar the moment their `VoteCast` event lands.

---

## Run it

### Contract tests
```bash
cd contracts
forge test -vv
```
Covers the threshold math, per-pod fund isolation (one pod can't touch another's balance), the full voting lifecycle in both directions, early-approve / early-reject / expiry / missed-deadline resolution, access control on every entry point, and reentrancy attackers on the refund path.

### Frontend
```bash
cd web
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_VAULT_ADDRESS + NEXT_PUBLIC_FACTORY_ADDRESS
pnpm dev                     # http://localhost:3000
```

---

## Architecture

Three contracts: two singletons plus a per-pod clone.

```
contracts/src/BondlineMath.sol     pure threshold math (shared by vault + pods)
contracts/src/BondlineVault.sol    all escrow, voting, and resolution state
contracts/src/PodFund.sol          per-pod clone: membership, threshold, shared fund
contracts/src/PodFundFactory.sol   EIP-1167 clone deployer + pod registry
web/                               Next.js + wagmi/viem, dark "countdowns" UI
```

- **`BondlineVault`** holds every commitment and withdrawal proposal under internal accounting (`mapping(id => Commitment)`), rather than a contract per commitment — cheaper gas, and Monad's throughput makes it the obvious default. It's the *only* address allowed to move a pod's money.
- **`PodFund`** is deployed once as an implementation template, then cloned per pod. Each clone owns its membership set, approval threshold, and forfeited-stake balance. Funds are physically isolated: a bug or drain against one pod can't reach another's balance, and only the vault can call `executeWithdrawal` / `depositForfeit`.
- **`PodFundFactory`** clones pods and maintains the registry the frontend reads (`allPods`) and the vault trusts (`isPod`).

### Threshold math

`requiredApprovals(eligibleVoters, bps) = max(1, ceil(eligibleVoters × bps / 10000))`.

For a **commitment**, eligible voters are everyone *but* the creator (you can't vote on your own claim). For a **withdrawal**, the whole membership is eligible (there's no creator to exclude). The frontend mirrors this pure function in `web/src/lib/threshold.ts` so the create-pod screen can spell out "with 4 other members, at least 2 must confirm" before anything is signed — but the chain is always the source of truth at resolution.

### Design decisions worth noting
- **Early resolution, both directions.** A vote doesn't wait out its window if the outcome is already decided: hitting the yes-bar refunds immediately, and making the yes-bar unreachable forfeits immediately. The window only matters when the vote stalls under the bar.
- **Silence forfeits, never deadlocks.** Three separate paths guarantee no stake is ever trapped: `castVote` auto-resolves on the decisive vote, `resolveExpired` settles a lapsed vote (forfeiting under the bar), and `forfeitMissed` forfeits a commitment whose creator blew the deadline without ever declaring. All three are permissionless.
- **Evidence is hashed, not stored.** The declaration takes an evidence URI plus its keccak hash; the hash is emitted on-chain so the link can't be swapped after voting starts, without paying to store the string.
- **Per-pod fund isolation is enforced, not conventional.** `PodFund` clones only accept calls from the vault, and the vault credits forfeits to the owning pod only. Tests assert one pod's balance is untouched when another resolves.
- **The financial sting shrinks as the pod grows.** In a pod of N, forfeiting costs you stake × (1 − 1/N). Pods of 3–6 are the sweet spot; past that the real deterrent is social (being *the one* who keeps funding the trip by never shipping), not the money.

**Known v1 limitations (worth saying out loud):**
- **No member add/remove after creation.** The pod's roster is fixed at deploy. A departing member's share of the pool stays in the pool. A later version could add governance for roster changes.
- **Withdrawal proposals have no expiry.** A stale proposal sits open until it clears the bar or is ignored. Fine at this scale; a real version would time them out.

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

The script prints the exact `web/.env.local` lines to paste (`NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_FACTORY_ADDRESS`).

## Security

It's an escrow contract, so it's written like one: ReentrancyGuard on every fund-moving path, checks-effects-interactions ordering (status finalized before any transfer), per-pod fund isolation, and reentrancy attacker contracts in the test suite proving a double-payout reverts. Core logic is immutable — no upgradeable proxy over user funds. This is a hackathon build and has not been formally audited; it runs on testnet with test MON.
