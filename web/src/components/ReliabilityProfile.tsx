"use client";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { useBonds, useCircles } from "@/lib/hooks";
import { reliability } from "@/lib/reliability";
import { formatMon, shortAddr } from "@/lib/format";
import { useProfiles } from "@/lib/useProfiles";
import { CORE_ADDRESS, coreAbi, hasV2, Status } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
export function ReliabilityProfile() {
  const { address }=useAccount();
  const { bonds,isLoading,error,refresh }=useBonds();
  const { circles }=useCircles();
  const { names }=useProfiles(address?[address]:[]);
  const mine=bonds.filter((b)=>b.creator.toLowerCase()===address?.toLowerCase());
  const stats=reliability(mine);
  const joined=circles.filter((c)=>c.members.some((m)=>m.toLowerCase()===address?.toLowerCase()));
  const supporters=useReadContract({address:CORE_ADDRESS,abi:coreAbi,functionName:"uniqueCosigners",args:[address??CORE_ADDRESS],query:{enabled:hasV2&&!!address,refetchInterval:15000}});
  const balance=useReadContract({address:CORE_ADDRESS,abi:coreAbi,functionName:"refundCredit",args:[address??CORE_ADDRESS],query:{enabled:hasV2&&!!address,refetchInterval:15000}});
  const write=useBondlineWrite(()=>{refresh();void balance.refetch();});
  if(!address)return <p className="my-10 text-muted">Sign in to see your commitment history.</p>;
  return <section className="my-8 flex flex-col gap-5"><div><p className="text-xs uppercase tracking-widest text-gold">Your follow-through</p><h1 className="font-display mt-3 text-3xl text-bone">{names[address.toLowerCase()]||"Your reliability profile"}</h1><p className="mt-2 break-all text-xs text-muted">Your account: {address}</p></div>
    {isLoading&&<p className="text-muted">Loading your history…</p>}{error&&<p role="alert" className="text-forfeit">History unavailable. Try again.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Reliability",stats.percentage===null?"—":`${stats.percentage}%`],["Completed",stats.completed],["Failed",stats.failed],["Consecutive completions",stats.streak],["Commitments",stats.total],["Active / in review",stats.active],["Total committed",`${formatMon(stats.totalStake)} MON`],["Circles joined",joined.length],["Unique supporters",supporters.data?.toString()??"—"]].map(([label,value])=><div className="rounded-xl border border-line bg-panel p-4" key={label}><p className="text-xs text-muted">{label}</p><p className="tnum mt-2 text-2xl text-bone">{value}</p></div>)}</div>
    <p className="text-xs leading-relaxed text-muted">Reliability = completed ÷ (completed + failed), rounded to a whole percentage. Active commitments are excluded. The streak counts consecutive completions ordered by deadline, ending at the most recent failure. This is your commitment history, not creditworthiness. All amounts come from escrow records.</p>
    {(balance.data??0n)>0n&&<div className="rounded-xl border border-gold/40 p-4"><p className="text-sm text-bone">{formatMon(balance.data!)} MON is ready to return to your account.</p><button disabled={write.isPending||write.isConfirming} onClick={()=>write.withdrawRefund(address)} className="mt-3 rounded-lg bg-gold p-3 text-ink">Receive returned stake</button>{write.error&&<p className="text-xs text-forfeit">{write.error}</p>}</div>}
    <h2 className="font-display text-lg text-bone">Your history</h2>{[...mine].reverse().map((b)=><Link key={b.id.toString()} href={`/circle/${b.circle}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4"><div><p className="text-sm text-bone">{b.description}</p><p className="mt-1 text-xs text-muted">{circles.find((c)=>c.address.toLowerCase()===b.circle.toLowerCase())?.name||shortAddr(b.circle)}</p></div><span className="text-xs text-gold">{b.status===Status.Met?"Completed":b.status===Status.Crossed?"Failed":b.status===Status.PendingCosign?"In review":"Active"} · {formatMon(b.stake)} MON</span></Link>)}{!isLoading&&!mine.length&&<p className="text-sm text-muted">Your first commitment starts your history.</p>}
  </section>;
}
