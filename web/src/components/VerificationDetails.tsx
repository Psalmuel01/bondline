"use client";
import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { CORE_ADDRESS, coreAbi, type Bond } from '@/lib/contracts';
import { useWalletSession } from '@/lib/useWalletSession';
import { explorerTx } from '@/lib/chain';
import { parseExternalSpec } from '../../scripts/verifier-adapters.mjs';

type Detail={config:{type:string;repo?:string;author?:string;commits?:number;contract?:string};status:string;lastVerificationTime:string|null;result:{current:number;required:number;settlementHash?:string}|null;error?:string;available:boolean};
const labels:Record<string,string>={not_checked:'Not checked',queued:'Checking',checking:'Checking',in_progress:'Requirement not yet met',requirement_met:'Requirement met · awaiting settlement',verified:'Verified ✓',failed:'Failed',error:'Verification error'};
export function VerificationDetails({bond,onChange}:{bond:Bond;onChange:()=>void}) {
 const {isAuthenticated,signIn,isSigningIn}=useWalletSession();
 const cache=useQueryClient();
 const [busy,setBusy]=useState(false),[error,setError]=useState<string>(),[transactionHash,setTransactionHash]=useState('');
 const raw=useReadContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'verificationSpec',args:[bond.id]});
 let config:Detail['config']|undefined;
 try {if(raw.data)config=parseExternalSpec(raw.data);}catch {/* Keep unsupported external rules visible. */}
 const detail=useQuery<Detail>({queryKey:['verification-detail',bond.id.toString()],queryFn:async()=>{const r=await fetch(`/api/verification/${bond.id}`,{cache:'no-store'});if(!r.ok)throw new Error('Verification details unavailable.');return r.json();},refetchInterval:10000});
 const data=detail.data;
 const lastFinal=useRef<string|undefined>(undefined);
 const phase=bond.status===2?'verified':bond.status===3?'failed':data?.status ?? 'not_checked';
 useEffect(()=>{if((data?.status==='verified'||data?.status==='failed') && lastFinal.current!==data.status){lastFinal.current=data.status;void cache.invalidateQueries();onChange();}},[data?.status,cache,onChange]);
 async function check() {
  setBusy(true);setError(undefined);
  try {
   if(!isAuthenticated)await signIn();
   const r=await fetch(`/api/verification/${bond.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(transactionHash?{transactionHash}:{})});
   const v=await r.json();if(!r.ok)throw new Error(v.error ?? (r.status===429?'Please wait a minute before checking again.':'Could not check progress.'));
   await detail.refetch();
  } catch(e){setError(e instanceof Error?e.message:'Could not check progress.');}finally{setBusy(false);}
 }
 return <section className="space-y-3 rounded-xl border border-line p-4" aria-label="Verification">
  <h4 className="text-sm font-semibold">Verification · {config?.type==='github'?'GitHub':config?.type==='onchain'?'Onchain activity':'External rule'}</h4>
  {config?.type==='github' && <dl className="space-y-1 text-xs"><div>Repository: <a className="text-gold" href={`https://github.com/${config.repo}`} target="_blank" rel="noreferrer">{config.repo}</a></div><div>User: {config.author}</div><div>Target: {config.commits} commits on the default branch</div></dl>}
  {config?.type==='onchain' && <p className="break-all text-xs text-muted">One successful direct call from your commitment account to {config.contract}.</p>}
  <p role="status" className="text-sm text-gold">{labels[phase] ?? phase}{data?.result && phase!=='failed'?` · ${data.result.current} / ${data.result.required}`:''}</p>
  <p className="text-xs text-muted">Deadline: {new Date(Number(bond.deadline)*1000).toLocaleString()}</p>
  {data?.lastVerificationTime && <p className="text-xs text-muted">Last checked: {new Date(data.lastVerificationTime).toLocaleString()}</p>}
  {bond.status===0 && <>
   {config?.type==='onchain' && <label className="block text-xs">Transaction hash<input className="product-field mt-2" value={transactionHash} onChange={e=>setTransactionHash(e.target.value)} placeholder="0x…"/></label>}
   <button className="secondary-button w-full" onClick={check} disabled={busy||isSigningIn||!data?.available||phase==='queued'||phase==='checking'}>{busy||isSigningIn?'Checking…':'Check progress'}</button>
   {data?.available===false && <p className="text-xs text-muted">The verification service is temporarily unavailable. Try again before the deadline.</p>}
   {Number(bond.deadline)*1000>Date.now() && <p className="text-xs text-muted">An unmet target keeps your commitment active. Successful verification must settle before the deadline.</p>}
  </>}
  {(error||data?.error) && <p role="alert" className="text-xs text-forfeit">{error||data?.error}</p>}
  {data?.result?.settlementHash && <a href={explorerTx(data.result.settlementHash)} target="_blank" rel="noreferrer" className="block text-xs text-gold">View settlement transaction ↗</a>}
  <details className="text-xs text-muted"><summary>Technical details</summary><p className="mt-2">CRE CLI simulation evaluates finalized evidence. An authorized server-side verifier submits the result to Monad testnet. This mode does not use a live Chainlink DON. Public activity does not establish ownership of the GitHub account. The service checks queued goals periodically, including expiry.</p></details>
 </section>;
}
