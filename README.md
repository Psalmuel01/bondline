# Bondline

**Stake on your word. Let your crew hold the line.**

Bondline turns a personal deadline into an on-chain object your friends enforce. You start a *Circle* with your crew, stake MON against your own deadline, and declare when you've shipped. Enough of the Circle confirms it and your stake refunds. Miss the deadline, or fail the vote, and the stake pools into the Circle's shared Pot — money your own misses hand to the group.

Built for the **Spark** hackathon on **Monad** (mainnet, chain `143`).

---

-- ## Demo

📹 **Demo video:** https://youtu.be/4dWGt0zatQI

🔗 **Live app:** https://bondline-circle.vercel.app/

---

## Deployed contracts (Monad mainnet, chain `143`)

Explorer: [monadscan.com](https://monadscan.com)

| Contract | Address |
| --- | --- |
| `BondlineCore` | [`0x111004038f8e918a02cd760e2e2630e0c9e789d6`](https://monadscan.com/address/0x111004038f8e918a02cd760e2e2630e0c9e789d6) |
| `CircleFactory` | [`0xb337fc04b8a146c93bcc7b57229cc8cb18c03fd6`](https://monadscan.com/address/0xb337fc04b8a146c93bcc7b57229cc8cb18c03fd6) |
| `Circle` (implementation) | [`0x8beafbe2da703a8ff869c8ab57863bdea5ad82bf`](https://monadscan.com/address/0x8beafbe2da703a8ff869c8ab57863bdea5ad82bf) |

---

## Why this exists

Every promise with a deadline — grant milestones, contributor bounties, your own side projects — relies on willpower or someone chasing you. There's no neutral thing that just *enforces the deadline*. Bondline is that thing, but it makes the enforcer your crew instead of a lone witness: the people who'd actually know if you shipped, voting together, with your stake on the line.

The shift from a single witness to a Circle is the whole point. One witness is a single point of failure and a coin-flip on collusion. A Circle of friends with a tunable approval threshold turns "did you ship?" into a group verdict, and turns everyone's individual misses into a shared Pot the group spends together.

---

## How it works

1. **Start a Circle** — name it, add your crew's addresses, pick a cosign threshold (e.g. 50%). You're auto-included as the first member. The Circle deploys as its own isolated vault contract (an EIP-1167 clone).
2. **Open a Bond** — describe it, set a deadline, escrow MON.
3. **Declare Met** before the deadline, attaching a receipts link (hashed on-chain so it can't be swapped later). This opens the cosign.
4. **The crew cosigns.** The instant *yes* cosigns clear the Circle's threshold, the stake refunds automatically. If objections make the bar unreachable, it forfeits early. If the cosign window lapses under the bar — or the deadline passes with no declaration at all — the stake forfeits to the Circle. Anyone can trigger the resolution; there's no way to trap a stake.
5. **Spend the Pot.** Forfeited stakes collect in the Circle's shared Pot. Any member proposes a payout; once the same threshold approves, it pays out.

Every action shows its transaction on the Monad explorer. Nothing is faked or optimistic — the UI reflects on-chain state only, and the voting panel lights up each member's avatar the moment their `Cosigned` event lands.

---

## Run it

### Contract tests
```bash
cd contracts
forge test -vv
```
Covers the threshold math, per-Circle Pot isolation (one Circle can't touch another's balance), the full voting lifecycle in both directions, early-approve / early-reject / expiry / missed-deadline resolution, access control on every entry point, and reentrancy attackers on the refund path.

### Frontend
```bash
cd web
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_CORE_ADDRESS + NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS
pnpm dev                     # http://localhost:3000
```

---

## Architecture

Four contracts: two singletons plus a per-Circle clone.

```
contracts/src/BondlineMath.sol     pure threshold math (shared by core + circles)
contracts/src/BondlineCore.sol     all escrow, voting, and resolution state
contracts/src/Circle.sol           per-circle clone: membership, threshold, shared Pot
contracts/src/CircleFactory.sol    EIP-1167 clone deployer + circle registry
web/                               Next.js + wagmi/viem, dark "countdowns" UI
```

- **`BondlineCore`** holds every Bond and payout proposal under internal accounting (`mapping(id => Bond)`), rather than a contract per Bond — cheaper gas, and Monad's throughput makes it the obvious default. It's the *only* address allowed to move a Circle's money.
- **`Circle`** is deployed once as an implementation template, then cloned per Circle. Each clone owns its membership set, approval threshold, and forfeited-stake balance (the Pot). Funds are physically isolated: a bug or drain against one Circle can't reach another's balance, and only the core can call `executeWithdrawal` / `depositForfeit`.
- **`CircleFactory`** clones Circles and maintains the registry the frontend reads (`allCircles`) and the core trusts (`isCircle`).

### Threshold math

`requiredApprovals(eligibleVoters, bps) = max(1, ceil(eligibleVoters × bps / 10000))`.

For a **Bond**, eligible voters are everyone *but* the creator (you can't vote on your own claim). For a **payout**, the whole membership is eligible (there's no creator to exclude). The frontend mirrors this pure function in `web/src/lib/threshold.ts` so the create-circle screen can spell out "with 4 other members, at least 2 must confirm" before anything is signed — but the chain is always the source of truth at resolution.

### Design decisions worth noting
- **Early resolution, both directions.** A vote doesn't wait out its window if the outcome is already decided: hitting the yes-bar refunds immediately, and making the yes-bar unreachable forfeits immediately. The window only matters when the vote stalls under the bar.
- **Silence forfeits, never deadlocks.** Three separate paths guarantee no stake is ever trapped: `cosign` auto-resolves on the decisive vote, `resolveExpired` settles a lapsed vote (forfeiting under the bar), and `crossMissed` forfeits a Bond whose creator blew the deadline without ever declaring. All three are permissionless.
- **Receipts are hashed, not stored.** The declaration takes a receipts URI plus its keccak hash; the hash is emitted on-chain so the link can't be swapped after voting starts, without paying to store the string.
- **Per-circle Pot isolation is enforced, not conventional.** `Circle` clones only accept calls from the core, and the core credits forfeits to the owning Circle only. Tests assert one Circle's balance is untouched when another resolves.
- **The financial sting shrinks as the Circle grows.** In a Circle of N, forfeiting costs you stake × (1 − 1/N). Circles of 3–6 are the sweet spot; past that the real deterrent is social (being *the one* who keeps funding the trip by never shipping), not the money.

**Known v1 limitations:**
- **No member add/remove after creation.** The Circle's roster is fixed at deploy. A departing member's share of the Pot stays in the Pot. A later version could add governance for roster changes.
- **Payout proposals have no expiry.** A stale proposal sits open until it clears the bar or is ignored. Fine at this scale; a real version would time them out.

---

## Deploy

```bash
cd contracts
cp .env.example .env          # set PRIVATE_KEY (funded mainnet deployer)
make deploy-verify-mainnet    # deploys to Monad mainnet, then verifies via sourcify
```

`deploy-verify-mainnet` deploys against `monad_mainnet` (chain `143`), verifies all three contracts on [monadscan.com](https://monadscan.com), and writes the deployed addresses straight into `web/.env.local` (`NEXT_PUBLIC_CORE_ADDRESS`, `NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS`). This spends real MON — make sure the deployer is funded.

## Security

It's an escrow contract, so it's written like one: ReentrancyGuard on every fund-moving path, checks-effects-interactions ordering (status finalized before any transfer), per-circle Pot isolation, and reentrancy attacker contracts in the test suite proving a double-payout reverts. Core logic is immutable — no upgradeable proxy over user funds. This is a hackathon build and has not been formally audited; it runs on Monad mainnet with real MON, so treat it as such.
