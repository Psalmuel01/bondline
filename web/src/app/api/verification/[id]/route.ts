import { getWalletSession } from '@/lib/server/session';
import { isCircleMember } from '@/lib/server/membership';
import { enqueueVerification, finalPhase, getJob, productConfigured, readVerification, workerAvailable } from '@/lib/server/verification';
import {after} from 'next/server';
import {workerWakeConfigured,wakeVerificationWorker} from '@/lib/server/verification-wake';
export const runtime='nodejs';
export const maxDuration=30;
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) {
  try {
    const {id}=await context.params;
    const {bond,rule,spec}=await readVerification(id);
    const job=rule[0]===2?await getJob(id):undefined;
    const final=finalPhase(bond[5]);
    const online=await workerAvailable();
    const onDemand=workerWakeConfigured();
    const matching=rule[1].toLowerCase()===process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS?.toLowerCase();
    const pending=Boolean(!final && job && ['queued','checking','in_progress','requirement_met','error'].includes(job.phase));
    if(onDemand && matching && pending && !online)after(wakeVerificationWorker);
    const starting=onDemand && matching && pending && !online;
    return Response.json({type:rule[0]===0?'manual':rule[0]===1?'balance':spec?.type,config:spec,targetBalance:rule[2].toString(),createdAt:Number(rule[4]),deadline:Number(bond[3]),status:final ?? job?.phase ?? 'not_checked',lastVerificationTime:job?.checked_at ?? null,requestedAt:job?.requested_at ?? null,result:job?.result ?? null,error:job?.error ?? null,available:productConfigured() && (online || onDemand) && matching,workerState:starting?'starting':online?'online':'offline',execution:onDemand?'on-demand':'continuous',mode:'cli-simulation'},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Verification details are temporarily unavailable.'},{status:503}); }
}
export async function POST(request:Request,context:Context) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Invalid request origin.'},{status:403});
  const session=await getWalletSession();
  if(!session) return Response.json({error:'Sign in to check progress.'},{status:401});
  if(!productConfigured()) return Response.json({error:'External verification is not operating yet.'},{status:503});
  try {
    const {id}=await context.params;
    const {bond,rule,spec}=await readVerification(id);
    if(rule[0]!==2 || rule[1].toLowerCase()!==process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS?.toLowerCase()) return Response.json({error:'This commitment uses a different verifier.'},{status:409});
    if(session.address.toLowerCase()!==bond[0].toLowerCase() && !(await isCircleMember(bond[1],session.address))) return Response.json({error:'Circle membership required.'},{status:403});
    const final=finalPhase(bond[5]);
    if(final) return Response.json({status:final});
    if(Number(request.headers.get('content-length') ?? 0)>2048) return Response.json({error:'Request too large.'},{status:413});
    const raw=await request.text();
    if(raw.length>2048) return Response.json({error:'Request too large.'},{status:413});
    const input=JSON.parse(raw || '{}');
    if(Object.keys(input).some(k=>k!=='transactionHash') || (input.transactionHash && !/^0x[0-9a-fA-F]{64}$/.test(input.transactionHash))) return Response.json({error:'Invalid transaction evidence.'},{status:400});
    if(spec?.type==='onchain' && !input.transactionHash && !(await getJob(id))?.transaction_hash) return Response.json({error:'Add the transaction hash for your contract call.'},{status:400});
    const queued=await enqueueVerification(id,rule[3],input.transactionHash);
    if(workerWakeConfigured())after(wakeVerificationWorker);
    return Response.json({status:queued?'queued':'checking',execution:workerWakeConfigured()?'on-demand':'continuous'},{status:queued?202:429,headers:queued?{}:{'Retry-After':'60'}});
  } catch { return Response.json({error:'Could not request verification. Try again shortly.'},{status:503}); }
}
