"use client";
import { useState } from 'react';
import { useAccount,useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { CORE_ADDRESS,coreAbi } from '@/lib/contracts';
import { useBondlineWrite } from '@/lib/useBondlineWrite';
import { explorerTx,monadMainnet } from '@/lib/chain';
import { ConnectButton } from './ConnectButton';
export function VerifierSetup(){
 const {address}=useAccount();
 const [verifier,setVerifier]=useState(process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS ?? '');
 const admin=useReadContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'deployer'});
 const trust=useReadContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'isTrustedVerifier',args:[isAddress(verifier)?verifier:'0x0000000000000000000000000000000000000000']});
 const write=useBondlineWrite(()=>{void trust.refetch();});
 const authorized=admin.data?.toLowerCase()===address?.toLowerCase();
 return <section className="space-y-6"><h1 className="font-display text-3xl">Product verifier setup</h1><p className="text-muted">Authorize the server-side demo worker to verify external commitments on Monad testnet. This grants settlement authority for new commitments that choose this verifier. Review the public address carefully.</p><dl className="space-y-2 break-all text-sm"><div>Network: {monadMainnet.name} ({monadMainnet.id})</div><div>Core: {CORE_ADDRESS}</div><div>Administrator: {admin.data ?? 'Loading…'}</div></dl>
 {!address && <ConnectButton label="Connect MetaMask" intent="signin"/>}
 <label className="block text-sm">Worker public address<input className="product-field mt-2" value={verifier} onChange={e=>setVerifier(e.target.value)} placeholder="0x…"/></label>
 {address && !authorized && <p className="text-forfeit text-sm">Switch MetaMask to the Core administrator account shown above.</p>}
 <button className="primary-button w-full" disabled={!authorized||!isAddress(verifier)||/^0x0{40}$/i.test(verifier)||trust.data===true||write.isPending||write.isConfirming||monadMainnet.id!==10143} onClick={()=>write.setTrustedVerifier(verifier as `0x${string}`,true)}>{trust.data?'Verifier authorized ✓':write.isPending||write.isConfirming?'Awaiting confirmation…':'Authorize verifier in MetaMask'}</button>
 {write.error&&<p role="alert" className="text-forfeit">{write.error}</p>}{write.hash&&<a className="text-gold" target="_blank" rel="noreferrer" href={explorerTx(write.hash)}>View authorization transaction ↗</a>}
 <p className="text-xs text-muted">Fund this worker address separately with a small amount of test MON for settlement fees. Test MON has no cash value. An in-memory demo worker needs a new authorization if restarted.</p>
 </section>;
}
