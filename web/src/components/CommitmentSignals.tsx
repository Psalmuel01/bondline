"use client";
import { useAccount, useReadContracts } from "wagmi";
import { CORE_ADDRESS, coreAbi, hasV2, Status, type Bond, type Circle } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { formatMon } from "@/lib/format";

export function useVerification(id: bigint) {
  const query = useReadContracts({ contracts: [{ address: CORE_ADDRESS, abi: coreAbi, functionName: "verification", args: [id] }], query: { enabled: hasV2, refetchInterval: 15000 } });
  return query.data?.[0]?.result;
}
export function CommitmentSignals({ bond, circle, onChange }: { bond: Bond; circle: Circle; onChange: () => void }) {
  const { address } = useAccount();
  const write = useBondlineWrite(onChange);
  const verification = useVerification(bond.id);
  const query = useReadContracts({ contracts: [
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "backerCount", args: [bond.id] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "hasBacked", args: [bond.id, address ?? CORE_ADDRESS] },
  ], query: { enabled: hasV2, refetchInterval: 10000 } });
  if (!hasV2) return null;
  const count = Number(query.data?.[0]?.result ?? 0);
  const backed = query.data?.[1]?.result;
  const kind = verification?.[0];
  const active = bond.status === Status.Active && Number(bond.deadline) * 1000 > Date.now();
  const canBack = active && address && address.toLowerCase() !== bond.creator.toLowerCase() && circle.members.some((m) => m.toLowerCase() === address.toLowerCase());
  const busy = write.isPending || write.isConfirming;
  return <div className="flex flex-col gap-2 border-t border-line pt-3">
    <p className="text-xs text-muted">{count} {count === 1 ? "friend" : "friends"} cosigned · {kind === undefined ? "Loading verification…" : kind === 0 ? "Circle evidence review" : kind === 1 ? `Balance target: ${formatMon(verification![2])} MON` : "GitHub · authorized verifier"}</p>
    {canBack && <button disabled={busy || backed === undefined || backed} onClick={() => write.backCommitment(bond.id)} className="rounded-lg border border-confirm/40 bg-confirm/10 p-2 text-sm text-confirm disabled:opacity-50">{backed ? "You cosigned this" : busy ? "Confirming…" : "I believe in you · Cosign"}</button>}
    {active && kind === 1 && <button disabled={busy || !address} onClick={() => write.verifyBalance(bond.id)} className="rounded-lg border border-gold/40 p-2 text-sm text-gold">{busy ? "Checking…" : "Check progress & return stake"}</button>}
    {active && kind === 2 && <p className="text-xs text-faint">The verifier checks your repository automatically. Keep the required commits on its default branch before this deadline.</p>}
    {write.error && <p role="alert" className="text-xs text-forfeit">{write.error}</p>}
  </div>;
}
