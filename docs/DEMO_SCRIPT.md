# Shipstake — 3-minute demo script

Rule for the whole video: **never assert anything you don't click.** Every claim is shown executing on-chain. That is the exact opposite of the "vaporware demo" the judges are primed to catch ("they always click it twice").

Have ready before recording:
- Wallet connected, on Monad Testnet, funded from the faucet.
- A second wallet (or a teammate's) to act as witness for the refund path.
- The app open on the live feed, with your real seed commitments visible.
- The MonadVision explorer open in a second tab.

---

### 0:00 – 0:15 · Cold open
> "I have five real deadlines this month — Privara, Shade, Lucent, VeilDrop, an audit. None of them can enforce themselves. So I built a contract that can."

Show the live feed: real commitments, countdowns ticking. Let a countdown visibly move.

### 0:15 – 0:35 · What it is, in one breath
> "You escrow MON behind a promise and name a witness. Ship in time, they refund you. Miss the deadline, and anyone can send your stake somewhere you'd hate. One contract, one screen of trust surface."

Scroll the stats bar (total staked, ship rate). Don't oversell — keep moving.

### 0:35 – 2:05 · The forfeit path (the un-fakeable core)
1. Click **Make a commitment**. Description: something real and checkable. Pick the **2-min** deadline preset. Small stake. Witness = your second address. Beneficiary = the default.
2. Submit → wallet confirms → **click the explorer link, show the tx on MonadVision.**
3. Back to the feed. The new card is LIVE, counting down. **Do not mark it complete.**
4. Talk over the countdown: witness griefing, why silence defaults to forfeiture not deadlock, funds go to beneficiary not caller.
5. Countdown hits 00:00 → card flips to **DEADLINE PASSED**, the **Claim forfeit** button lights up.
6. Click it → confirm → **explorer tab: stake moved to the beneficiary.** Card is now FORFEITED, stake shown as the historical record.

> "I never touched it. The deadline passed and the chain resolved it. I didn't have to trust anyone to enforce that."

### 2:05 – 2:40 · The refund path
1. Create a second commitment, 2-min deadline, witness = your second wallet.
2. Switch to the witness wallet → the card now shows **Vouch: they shipped**.
3. Click it → confirm → refund lands, card flips to **SHIPPED**. Show the tx.

> "Both branches, both real, both on-chain."

### 2:40 – 3:00 · The ceiling, then stop
> "Swap the beneficiary for a grant program and this is milestone-gated funding that enforces itself — Stacks, SCF, any DAO paying contributors. Today it's my five deadlines. That's Shipstake."

Hard stop under 3:00.

---

### Things to *not* do on camera
- Don't mention the fee model — meaningless on testnet, invites an awkward question.
- Don't pitch the prediction-market layer — makes a 2-day escrow sound like vaporware.
- Don't cut away from the chain during the resolution. The unbroken take *is* the pitch.
