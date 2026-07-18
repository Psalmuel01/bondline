// Client-side mirror of contracts/src/BondlineMath.sol. Used only for live UI
// previews (the "with 4 friends, at least 2 must cosign" copy and the running
// tally). The chain is always the source of truth at resolution time; this just
// lets the UI show the same numbers without a round-trip.

const BPS = 10_000;

/// ceil(eligibleCosigners * bps / 10000), floored at 1. Matches BondlineMath.
export function requiredCosigns(eligibleCosigners: number, bps: number): number {
  const needed = Math.ceil((eligibleCosigners * bps) / BPS);
  return needed < 1 ? 1 : needed;
}

/// For a Circle of `memberCount` at `bps`, how many cosigns a Bond needs —
/// eligible cosigners are everyone but the creator.
export function requiredForBond(memberCount: number, bps: number): number {
  return requiredCosigns(Math.max(memberCount - 1, 0), bps);
}

/// For a Pot payout the whole membership is eligible (no creator to exclude).
export function requiredForPayout(memberCount: number, bps: number): number {
  return requiredCosigns(memberCount, bps);
}

export function bpsToPct(bps: number): number {
  return Math.round((bps / BPS) * 100);
}

/// Human sentence for the create-Circle preview.
export function thresholdSentence(memberCount: number, bps: number): string {
  if (memberCount < 2) return "Add at least one friend to preview the rule.";
  const eligible = memberCount - 1;
  const need = requiredForBond(memberCount, bps);
  const friends = memberCount - 1;
  return `With ${friends} other ${friends === 1 ? "member" : "members"}, at least ${need} of ${eligible} must cosign a Bond for it to clear.`;
}
