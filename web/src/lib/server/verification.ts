import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { createPublicClient, http, keccak256, toBytes, parseAbi } from 'viem';
import { CORE_ADDRESS, coreAbi, hasV2, Status } from '@/lib/contracts';
import { monadMainnet } from '@/lib/chain';
import { parseExternalSpec, verificationWindow } from '../../../scripts/verifier-adapters.mjs';
import { supabaseAdminRequest } from './supabase-admin';

export const verificationClient = createPublicClient({chain:monadMainnet,transport:http(process.env.MONAD_RPC_URL)});
export const receiverAbi = parseAbi(['function progress(uint256) view returns (uint256 current,uint256 target,uint64 checkedAt,uint8 outcome,bytes32 evidenceHash)','function core() view returns (address)']);
export type VerificationJob = { commitment_id:string;condition_hash:string;phase:string;transaction_hash:string|null;lease_id:string;lease_until:string;requested_at:string;checked_at:string|null;result:Record<string,unknown>|null;error:string|null };
export function workerAuthorized(request:Request) {
  const expected=process.env.BONDLINE_VERIFICATION_WORKER_SECRET;
  const value=request.headers.get('authorization')?.replace(/^Bearer /,'');
  return Boolean(expected && expected.length>=32 && value && Buffer.byteLength(value)===Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(value),Buffer.from(expected)));
}
export function productConfigured() {
  const address=process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS;
  return hasV2 && monadMainnet.id===10143 && process.env.BONDLINE_VERIFICATION_MODE==='cli-simulation' && process.env.BONDLINE_VERIFICATION_WORKER_ENABLED==='true' && /^0x[0-9a-fA-F]{40}$/.test(address ?? '') && !/^0x0{40}$/i.test(address ?? '') && (process.env.BONDLINE_VERIFICATION_WORKER_SECRET?.length ?? 0)>=32;
}
export async function readVerification(id:string) {
  if (!/^(0|[1-9][0-9]{0,77})$/.test(id) || BigInt(id)>=2n**256n) throw new Error('Invalid commitment ID');
  const args=[BigInt(id)] as const;
  const block=await verificationClient.getBlock({blockTag:'finalized'});
  if (await verificationClient.getChainId()!==monadMainnet.id) throw new Error('Wrong network');
  const [bond,rule,raw]=await Promise.all([
    verificationClient.readContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'bonds',args,blockNumber:block.number}),
    verificationClient.readContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'verification',args,blockNumber:block.number}),
    verificationClient.readContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'verificationSpec',args,blockNumber:block.number}),
  ]);
  if (bond[0]==='0x0000000000000000000000000000000000000000') throw new Error('Commitment not found');
  const spec=rule[0]===2 ? parseExternalSpec(raw) : null;
  if (spec) { if(keccak256(toBytes(raw))!==rule[3]) throw new Error('Condition hash mismatch'); verificationWindow(spec,Number(rule[4]),Number(bond[3])); }
  return {bond,rule,spec,block};
}
export const jobFilter=(id:string)=>`chain_id=eq.${monadMainnet.id}&core_address=eq.${CORE_ADDRESS.toLowerCase()}&commitment_id=eq.${id}`;
export async function getJob(id:string) {
  return (await supabaseAdminRequest<VerificationJob[]>(`verification_jobs?${jobFilter(id)}&limit=1`))[0];
}
export async function enqueueVerification(id:string,conditionHash:string,tx?:string) {
  return supabaseAdminRequest<boolean>('rpc/request_verification',{method:'POST',body:JSON.stringify({p_chain:monadMainnet.id,p_core:CORE_ADDRESS,p_id:id,p_hash:conditionHash,p_tx:tx ?? null})});
}
export function finalPhase(status:number) { return status===Status.Met ? 'verified' : status===Status.Crossed ? 'failed' : undefined; }
export async function workerAvailable() {
  if(!productConfigured()) return false;
  const rows=await supabaseAdminRequest<{heartbeat_at:string}[]>(`verification_workers?chain_id=eq.${monadMainnet.id}&core_address=eq.${CORE_ADDRESS.toLowerCase()}&limit=1`);
  return Boolean(rows[0] && Date.now()-Date.parse(rows[0].heartbeat_at)<240000);
}
