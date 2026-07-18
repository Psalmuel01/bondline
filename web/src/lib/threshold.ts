// Client-side mirror of contracts/src/BondlineMath.sol. Used only for live UI
// previews (the "with 4 friends, at least 2 must confirm" copy and the running
// tally). The chain is always the source of truth at resolution time; this just
// lets the UI show the same numbers without a round-trip.

const BPS = 10_000;

/// ceil(eligibleVoters * bps / 10000), floored at 1. Matches BondlineMath.
export function requiredApprovals(eligibleVoters: number, bps: number): number {
  const needed = Math.ceil((eligibleVoters * bps) / BPS);
  return needed < 1 ? 1 : needed;
}

/// For a pod of `memberCount` at `bps`, how many confirmations a commitment
/// needs — eligible voters are everyone but the creator.
export function requiredForCommitment(memberCount: number, bps: number): number {
  return requiredApprovals(Math.max(memberCount - 1, 0), bps);
}

/// For a withdrawal the whole membership is eligible (no creator to exclude).
export function requiredForWithdrawal(memberCount: number, bps: number): number {
  return requiredApprovals(memberCount, bps);
}

export function bpsToPct(bps: number): number {
  return Math.round((bps / BPS) * 100);
}

/// Human sentence for the create-Circle preview.
export function thresholdSentence(memberCount: number, bps: number): string {
  if (memberCount < 2) return "Add at least one friend to preview the rule.";
  const eligible = memberCount - 1;
  const need = requiredForCommitment(memberCount, bps);
  const friends = memberCount - 1;
  return `With ${friends} other ${friends === 1 ? "member" : "members"}, at least ${need} of ${eligible} must cosign a Bond for it to clear.`;
}
