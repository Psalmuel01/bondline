# Bondline — 3-Minute Demo Script

**Goal:** show the un-fakeable core — a group holding one member to a deadline, and the stake resolving on-chain either way — in under three minutes, without cutting away from the chain.

> Prep: two wallets (you + one pod-mate) funded with test MON on Monad testnet. A pod already created with both as members at a 50% threshold, so you can skip straight to staking. Have a commitment pre-staked with a **2-min deadline** for the forfeit path, and be ready to create a fresh one live for the refund path.

---

### 0:00 – 0:15 · Cold open
> "I have real deadlines this month, and none of them enforce themselves. So my friends and I built a contract that does it for us. Money on the line, the group decides."

Show the dashboard: your pod, its pooled balance, a live commitment counting down.

### 0:15 – 0:35 · What it is, in one breath
> "You start a pod with your crew and stake MON against your own deadline. Ship in time, the group votes yes and you're refunded. Miss it, and your stake pools into a shared fund the group spends together. Every pod is its own vault on-chain."

Open the pod page. Point at the member avatars and the threshold line ("2 of us must confirm").

### 0:35 – 2:05 · The forfeit path (the un-fakeable core)
1. Point at the pre-staked commitment on the **2-min** deadline. **Don't declare it complete.**
2. Talk over the countdown: why a pod beats a single witness (no single point of collusion), why silence always forfeits instead of deadlocking, and that the shared fund is where the miss goes.
3. Countdown hits 00:00 → the card flips to **deadline passed** and the **Forfeit → send stake to the pod** button lights up.
4. Click it → confirm → **explorer tab: stake moved into the pod fund.** The card is now FORFEITED, and the pod's pooled balance visibly ticks up.

> "I never declared, the deadline passed, and anyone could push that stake into our shared pot. Nobody had to trust me to enforce it."

### 2:05 – 2:40 · The refund path (the vote)
1. Create a fresh commitment with a 2-min deadline, small stake.
2. Immediately **declare complete** with an evidence link → the vote window opens, the card shows a live tally.
3. Switch to the pod-mate wallet → their avatar is lit as "can vote" → click **approve**.
4. The instant the yes-votes clear the threshold, the stake refunds and the card flips to **completed**. Show the tx.

> "Both branches, both real, both on-chain — and the second one resolved the moment the group hit the bar, no waiting out the clock."

### 2:40 – 3:00 · The shared fund, then stop
> "Those forfeited stakes pile up here. Any of us proposes a payout — a trip, a dinner — the group approves on the same threshold, and it pays out. Our misses fund the group's next thing. That's Bondline."

Point at the pooled balance and the Propose withdrawal panel. Hard stop under 3:00.

---

### Things to *not* do on camera
- Don't mention any fee model — meaningless on testnet, invites an awkward question.
- Don't pitch the spectator-market layer — makes a weekend build sound like vaporware.
- Don't cut away from the chain during a resolution. The unbroken take *is* the pitch.
- Don't try to demo a large pod — a 2-person pod at 50% keeps the vote math legible on screen.
