// Supervised, server-side bridge. CRE CLI evaluates; an explicitly trusted
// EOA submits settlement. This is CLI simulation, NOT DON-signed verification.
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createPublicClient,createWalletClient,http,parseAbi,keccak256,toBytes} from 'viem';
import {privateKeyToAccount,generatePrivateKey} from 'viem/accounts';
import {monadTestnet} from 'viem/chains';
import {parseExternalSpec,requiredProgress} from '../../web/scripts/verifier-adapters.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const cli=process.env.CRE_CLI_PATH;
const wasm=resolve(root,'github-verifier/dist/workflow.wasm');
const app=new URL(process.env.BONDLINE_APP_URL);
if(app.protocol!=='https:' && !['localhost','127.0.0.1'].includes(app.hostname)) throw new Error('Use HTTPS for the application');
const secret=process.env.BONDLINE_VERIFICATION_WORKER_SECRET;
if(!cli || !existsSync(cli) || !existsSync(wasm) || !secret || secret.length<32) throw new Error('Configure the CLI, compiled workflow, app URL, and worker secret');
if(!process.env.BONDLINE_VERIFIER_PRIVATE_KEY && process.env.BONDLINE_VERIFICATION_EPHEMERAL_SIGNER!=='true') throw new Error('Provide a secure runtime signer or explicitly enable an ephemeral testnet demo signer');
const account=privateKeyToAccount(process.env.BONDLINE_VERIFIER_PRIVATE_KEY ?? generatePrivateKey());
console.log(JSON.stringify({productVerifier:account.address,chainId:10143,ephemeral:!process.env.BONDLINE_VERIFIER_PRIVATE_KEY,note:'This public address must be authorized and funded with test MON. An ephemeral signer is lost when the worker exits.'}));
const core=process.env.NEXT_PUBLIC_CORE_ADDRESS;
const client=createPublicClient({chain:monadTestnet,transport:http(process.env.MONAD_RPC_URL)});
const wallet=createWalletClient({account,chain:monadTestnet,transport:http(process.env.MONAD_RPC_URL)});
const abi=parseAbi([
 'function protocolVersion() view returns(uint256)',
 'function isTrustedVerifier(address) view returns(bool)',
 'function bonds(uint256) view returns(address,address,uint96,uint64,uint64,uint8,uint32,uint32,string,bytes32,string)',
 'function verification(uint256) view returns(uint8,address,uint96,bytes32,uint64)',
 'function verificationSpec(uint256) view returns(string)',
 'function attest(uint256,bool,bytes32,bytes32)',
]);
const read=(functionName,args=[])=>client.readContract({address:core,abi,functionName,args});
if(await client.getChainId()!==10143 || await read('protocolVersion')!==2n) throw new Error('Wrong deployed testnet Core');
while(!await read('isTrustedVerifier',[account.address])) {console.log('Waiting for MetaMask authorization of the product verifier.');await new Promise(r=>setTimeout(r,15000));}
const endpoint=new URL('/api/verification/jobs',app);
async function api(method,body) {
 const response=await fetch(endpoint,{method,headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 if(!response.ok) throw new Error(`Verification service returned ${response.status}`);
 return response.json();
}
function runSimulation(config) {
 const dir=mkdtempSync(join(tmpdir(),'bondline-product-cre-'));
 const path=join(dir,'config.json'); writeFileSync(path,JSON.stringify(config),{mode:0o600});
 return new Promise((resolve,reject)=>{
  // Never --broadcast: the CLI only evaluates. Production receiver identity
  // checks are never weakened to accept a mock forwarder.
  const child=spawn(cli,['workflow','simulate','github-verifier','--target','staging-settings','--config',path,'--wasm',wasm,'--trigger-index','0','--non-interactive'],{cwd:root,env:{...process.env,BONDLINE_VERIFIER_PRIVATE_KEY:undefined,BONDLINE_VERIFICATION_WORKER_SECRET:undefined}});
  let out='';const timer=setTimeout(()=>child.kill('SIGTERM'),180000);
  const collect=data=>{out+=data.toString();if(out.length>1000000)child.kill('SIGTERM');};child.stdout.on('data',collect);child.stderr.on('data',collect);
  child.on('error',error=>{clearTimeout(timer);rmSync(dir,{recursive:true,force:true});reject(error);});
  child.on('close',code=>{clearTimeout(timer);rmSync(dir,{recursive:true,force:true});
   if(code!==0)return reject(new Error('CRE CLI evaluation failed'));
   const lines=out.split('\n').filter(line=>line.includes('BONDLINE_RESULT '));
   if(lines.length!==1)return reject(new Error('Expected one CRE evaluation result'));
   try {resolve(JSON.parse(lines[0].split('BONDLINE_RESULT ')[1]));}catch {reject(new Error('Invalid CRE result'));}
  });
 });
}
async function processJob(job) {
 const id=BigInt(job.commitment_id);
 const [bond,rule,raw]=await Promise.all([read('bonds',[id]),read('verification',[id]),read('verificationSpec',[id])]);
 if(bond[5]!==0) {await api('POST',{id:job.commitment_id,leaseId:job.lease_id});return;}
 if(rule[0]!==2 || rule[1].toLowerCase()!==account.address.toLowerCase() || rule[3]!==job.condition_hash || keccak256(toBytes(raw))!==rule[3]) throw new Error('Immutable verifier rule mismatch');
 const spec=parseExternalSpec(raw);
 const result=await runSimulation({schedule:'0 */1 * * * *',coreAddress:core,receiverAddress:account.address,commitmentIds:[job.commitment_id],reportGasLimit:'220000',observeOnly:true,transactionHash:job.transaction_hash ?? undefined});
 if(result.version!==1 || result.chainId!==10143 || result.core!==core.toLowerCase() || result.verifier!==account.address.toLowerCase() || result.commitmentId!==job.commitment_id || result.verifierType!==spec.type || result.conditionHash!==rule[3] || result.required!==requiredProgress(spec) || !Number.isInteger(result.current) || result.current<0 || result.current>result.required || ![0,1,2].includes(result.outcome) || !/^0x[0-9a-f]{64}$/i.test(result.evidenceHash)) throw new Error('Invalid CRE result binding');
 const evidenceBlock=await client.getBlock({blockNumber:BigInt(result.blockNumber)});
 if(evidenceBlock.hash!==result.blockHash || Number(evidenceBlock.timestamp)!==result.checkedAt || result.checkedAt<Number(rule[4])) throw new Error('Evidence block mismatch');
 if((result.outcome===1 && (result.current<result.required || result.checkedAt>=Number(bond[3]))) || (result.outcome===2 && result.checkedAt<Number(bond[3]))) throw new Error('Invalid result timing');
 let settlementHash;
 const fresh=await read('bonds',[id]);
 const now=(await client.getBlock()).timestamp;
 if(fresh[5]===0 && result.outcome!==0) {
  // The existing Core requires the SUCCESS TRANSACTION before the deadline.
  // A delayed successful observation is not converted into a false success.
  if(result.outcome===1 && now>=fresh[3]) {await api('POST',{id:job.commitment_id,leaseId:job.lease_id,result,error:true});return;}
  const args=[id,result.outcome===1,rule[3],result.evidenceHash];
  const gas=await client.estimateContractGas({account,address:core,abi,functionName:'attest',args});
  settlementHash=await wallet.writeContract({address:core,abi,functionName:'attest',args,gas:gas+gas/20n});
  const receipt=await client.waitForTransactionReceipt({hash:settlementHash});
  if(receipt.status!=='success') throw new Error('Settlement reverted');
 }
 await api('POST',{id:job.commitment_id,leaseId:job.lease_id,result,settlementHash});
 console.log(JSON.stringify({commitmentId:job.commitment_id,progress:`${result.current}/${result.required}`,outcome:result.outcome,settlementHash: settlementHash ?? null,mode:'CRE CLI simulation + trusted EOA settlement'}));
}
let stop=false;process.on('SIGINT',()=>stop=true);process.on('SIGTERM',()=>stop=true);
console.log('Bondline product verification worker running on Monad testnet. CLI simulation; trusted EOA settlement.');
do {
 let job;
 try {const response=await api('GET');if(response.chainId!==10143 || response.core.toLowerCase()!==core.toLowerCase() || response.verifier.toLowerCase()!==account.address.toLowerCase())throw new Error('Application deployment mismatch');job=response.job;if(job)await processJob(job);}
 catch {console.error('Verification attempt failed; no fabricated completion.');if(job)await api('POST',{id:job.commitment_id,leaseId:job.lease_id,error:true}).catch(()=>undefined);}
 if(process.argv.includes('--once'))break;
 await new Promise(r=>setTimeout(r,10000));
} while(!stop);
