export function evidenceNotification({ backed, responded, eligible, closesAt, now }: { backed: boolean; responded: boolean; eligible: boolean; closesAt: bigint; now: number }) {
  if (responded || Number(closesAt) * 1000 <= now) return null;
  if (backed) return "Evidence is ready for a commitment you backed";
  return eligible ? "Evidence needs your review" : null;
}
