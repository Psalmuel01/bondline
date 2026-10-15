import { CORE_ADDRESS, coreAbi } from '@/lib/contracts';
import { monadMainnet } from '@/lib/chain';
import { enqueueVerification, finalPhase, jobFilter, productConfigured, readVerification, verificationClient, workerAuthorized, type VerificationJob } from '@/lib/server/verification';
import { supabaseAdminRequest } from '@/lib/server/supabase-admin';
import { runIndexerBatch } from '@/lib/server/indexer';
import { decodeEventLog } from 'viem';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
  if(!workerAuthorized(request)) return Response.json({error:'Unauthorized.'},{status:401});
  if(!productConfigured()) return Response.json({error:'Worker configuration is disabled.'},{status:503});
  try {
    const workers=await supabaseAdminRequest<{scan_next_id:string}[]>(`verification_workers?chain_id=eq.${monadMainnet.id}&core_address=eq.${CORE_ADDRESS.toLowerCase()}&limit=1`);
    await supabaseAdminRequest('verification_workers?on_conflict=chain_id,core_address',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({chain_id:monadMainnet.id,core_address:CORE_ADDRESS.toLowerCase(),heartbeat_at:new Date().toISOString(),scan_next_id:workers[0]?.scan_next_id ?? '0'})});
    const count=await verificationClient.readContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'bondCount'});
    let cursor=BigInt(workers[0]?.scan_next_id ?? '0');
    for(let scanned=0;scanned<5 && BigInt(scanned)<count;scanned++) {
      if(cursor>=count)cursor=0n;
      const id=cursor.toString();cursor++;
      try {
        const current=await readVerification(id);
        if(current.bond[5]===0 && current.rule[0]===2 && current.rule[1].toLowerCase()===process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS?.toLowerCase()) {
          await enqueueVerification(id,current.rule[3]);
        }
      } catch { /* Unsupported rules cannot produce verification jobs. */ }
    }
    await supabaseAdminRequest(`verification_workers?chain_id=eq.${monadMainnet.id}&core_address=eq.${CORE_ADDRESS.toLowerCase()}`,{method:'PATCH',body:JSON.stringify({scan_next_id:cursor.toString()})});
    // Requeue active known jobs periodically, including after deadline. No new
    // hosted cron is needed: the supervised worker drives this same service.
    const due=await supabaseAdminRequest<VerificationJob[]>(`verification_jobs?chain_id=eq.${monadMainnet.id}&core_address=eq.${CORE_ADDRESS.toLowerCase()}&phase=in.(in_progress,requirement_met,error)&requested_at=lt.${new Date(Date.now()-60000).toISOString()}&order=requested_at.asc&limit=5`);
    for(const job of due) await enqueueVerification(job.commitment_id,job.condition_hash);
    const jobs=await supabaseAdminRequest<VerificationJob[]>('rpc/claim_verification',{method:'POST',body:JSON.stringify({p_chain:monadMainnet.id,p_core:CORE_ADDRESS})});
    return Response.json({job:jobs[0] ?? null,chainId:monadMainnet.id,core:CORE_ADDRESS,verifier:process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Verification queue unavailable.'},{status:503}); }
}
export async function POST(request:Request) {
  if(!workerAuthorized(request)) return Response.json({error:'Unauthorized.'},{status:401});
  try {
    const raw=await request.text();
    if(raw.length>8192) return Response.json({error:'Result too large.'},{status:413});
    const input=JSON.parse(raw);
    if(!/^(0|[1-9][0-9]{0,77})$/.test(input.id) || !/^[0-9a-f-]{36}$/i.test(input.leaseId)) return Response.json({error:'Invalid job.'},{status:400});
    const {bond,rule,spec}=await readVerification(input.id);
    const result=input.result;
    if(result && (result.version!==1 || result.chainId!==10143 || result.core!==CORE_ADDRESS.toLowerCase() || result.commitmentId!==input.id || result.conditionHash!==rule[3] || result.verifier!==rule[1].toLowerCase() || result.verifierType!==spec?.type || !Number.isInteger(result.current) || !Number.isInteger(result.required) || result.required!==(spec.type==='github'?spec.commits:1) || result.current<0 || result.current>result.required || !Number.isSafeInteger(result.checkedAt) || !/^0x[0-9a-f]{64}$/i.test(result.evidenceHash))) return Response.json({error:'Result binding mismatch.'},{status:400});
    let phase=finalPhase(bond[5]) ?? (result?.outcome===1?'requirement_met':'in_progress');
    if(input.error && !finalPhase(bond[5])) phase='error';
    if(input.settlementHash) {
      if(!/^0x[0-9a-f]{64}$/i.test(input.settlementHash)) throw new Error('Invalid settlement receipt');
      const receipt=await verificationClient.getTransactionReceipt({hash:input.settlementHash});
      const valid=receipt.status==='success' && receipt.logs.some(log=>{
        if(log.address.toLowerCase()!==CORE_ADDRESS.toLowerCase()) return false;
        try { const decoded=decodeEventLog({abi:coreAbi,data:log.data,topics:log.topics}); return decoded.eventName==='CommitmentVerified' && decoded.args.id===BigInt(input.id) && decoded.args.success===(result?.outcome===1) && decoded.args.evidenceHash===result?.evidenceHash; } catch { return false; }
      });
      if(!valid) throw new Error('Settlement receipt mismatch');
    }
    const rows=await supabaseAdminRequest<VerificationJob[]>(`verification_jobs?${jobFilter(input.id)}&lease_id=eq.${input.leaseId}&lease_until=gt.${new Date().toISOString()}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({phase,...(result?{checked_at:new Date(result.checkedAt*1000).toISOString(),result:{...result,settlementHash:input.settlementHash ?? null}}:{}),error:input.error?'Verification is temporarily unavailable. Your commitment has not been marked complete by this check.':null,lease_until:null})});
    if(!rows.length) return Response.json({error:'Job lease expired.'},{status:409});
    if(input.settlementHash) await runIndexerBatch().catch(()=>undefined);
    return Response.json({status:phase});
  } catch { return Response.json({error:'Could not record verification result.'},{status:503}); }
}
