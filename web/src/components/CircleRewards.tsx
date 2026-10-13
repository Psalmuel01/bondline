"use client";
import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { CORE_ADDRESS, coreAbi, circleAbi, type Circle, type Bond, Status } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { formatMon } from "@/lib/format";
import { isAddress } from "viem";
const WEEK = 604800n;
export function CircleRewards({ circle, bonds, onChange }: { circle: Circle; bonds: Bond[]; onChange: () => void }) {
  const { address } = useAccount();
  const epochs = [...new Set(bonds.filter((b) => b.status === Status.Met && b.creator.toLowerCase() === address?.toLowerCase()).map((b) => b.deadline / WEEK))].sort((a,b) => Number(b-a));
  return <section className="rounded-xl border border-line bg-panel p-5"><h2 className="font-display text-lg text-bone">Following through pays off</h2><p className="my-3 text-sm text-muted">Missed commitments fund this Pot. After a deadline week closes and every commitment settles, each completed commitment earns an equal share. Weeks with no completions roll forward. Nobody can withdraw these funds by a vote.</p>{epochs.length ? epochs.map((epoch) => <Reward key={epoch.toString()} epoch={epoch} circle={circle} onChange={onChange} />) : <p className="text-xs text-faint">Complete a commitment to become eligible for weekly rewards.</p>}</section>;
}
function Reward({ epoch, circle, onChange }: { epoch: bigint; circle: Circle; onChange: () => void }) {
  const { address } = useAccount();
  const write = useBondlineWrite(onChange);
  const query = useReadContracts({ contracts: [
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "periodPending", args: [circle.address,epoch] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "periodSuccesses", args: [circle.address,epoch] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "memberSuccesses", args: [circle.address,epoch,address ?? CORE_ADDRESS] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "rewardClaimed", args: [circle.address,epoch,address ?? CORE_ADDRESS] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "periodClosed", args: [circle.address,epoch] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "rewardPool", args: [circle.address,epoch] },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "periodPot", args: [circle.address,epoch] },
  ], query: { refetchInterval: 10000 } });
  const d=query.data;
  const ready=d?.every((v)=>v.status==="success");
  const pending=d?.[0]?.result ?? 0n, successes=d?.[1]?.result ?? 0n, mine=d?.[2]?.result ?? 0n;
  const claimed=d?.[3]?.result, closed=d?.[4]?.result;
  const pool=(closed?d?.[5]?.result:d?.[6]?.result) ?? 0n;
  const amount=successes>0n?pool/successes*mine:0n;
  const ended=Date.now()/1000 >= Number((epoch+1n)*WEEK);
  const label=new Date(Number(epoch*WEEK)*1000).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  return <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line p-3"><p className="text-sm text-bone">Week of {label} · {formatMon(amount)} MON earned</p><p className="text-xs text-muted">{!ended?"Week is still open":pending>0n?`${pending} commitments still need settlement`:claimed?"Reward received":amount===0n?"No funds in this week's Pot":"Ready to receive"}</p><button disabled={!ready || !address || !ended || pending>0n || claimed || amount===0n || write.isPending || write.isConfirming} onClick={() => address && write.claimReward(circle.address,epoch,address)} className="rounded-lg bg-gold p-2 text-sm font-semibold text-ink disabled:opacity-40">{write.isPending || write.isConfirming?"Confirming…":"Receive reward"}</button>{write.error&&<p role="alert" className="text-xs text-forfeit">{write.error}</p>}</div>;
}
export function CircleMembership({ circle, onChange }: { circle: Circle; onChange: () => void }) {
  const { address } = useAccount();
  const [invitee,setInvitee]=useState("");
  const write=useBondlineWrite(onChange);
  const isMember=circle.members.some((m)=>m.toLowerCase()===address?.toLowerCase());
  const query=useReadContracts({ contracts:[{address:circle.address,abi:circleAbi,functionName:"invited",args:[address??CORE_ADDRESS]}],query:{enabled:!!address,refetchInterval:15000}});
  if (!address) return <p className="text-sm text-muted">Sign in to join your friends.</p>;
  return <div className="rounded-xl border border-line bg-panel p-5"><h2 className="text-base text-bone">{isMember?"Invite a friend":"Join this Circle"}</h2>{isMember?<div className="mt-3 flex flex-wrap gap-2"><input aria-label="Friend's account address" placeholder="Friend’s account address" value={invitee} onChange={(e)=>setInvitee(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-bg p-2 text-sm"/><button disabled={!isAddress(invitee)||write.isPending||write.isConfirming} onClick={()=>write.invite(circle.address,invitee as `0x${string}`)} className="rounded-lg bg-gold p-2 text-sm text-ink disabled:opacity-40">Invite</button></div>:<button disabled={!query.data?.[0]?.result||write.isPending||write.isConfirming} onClick={()=>write.join(circle.address)} className="mt-3 rounded-lg bg-gold p-2 text-sm text-ink disabled:opacity-40">{query.data?.[0]?.result?"Accept invitation":"Ask a member to invite you"}</button>}{write.error&&<p className="mt-2 text-xs text-forfeit">{write.error}</p>}</div>;
}
