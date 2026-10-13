import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, keccak256, toBytes, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad, monadTestnet } from 'viem/chains';
import { parseGithubSpec, countCommits } from './verification.mjs';
const chain=process.env.NEXT_PUBLIC_CHAIN_ID==='10143'?monadTestnet:monad;
const address=process.env.NEXT_PUBLIC_CORE_ADDRESS;
if(!address||!isAddress(address))throw new Error('Configure NEXT_PUBLIC_CORE_ADDRESS');
const abi=JSON.parse(readFileSync(new URL('../../contracts/out/BondlineCore.sol/BondlineCore.json',import.meta.url))).abi;
const client=createPublicClient({chain,transport:http(process.env.MONAD_RPC_URL)});
const broadcast=process.argv.includes('--broadcast');
if(broadcast&&!process.env.BONDLINE_VERIFIER_PRIVATE_KEY)throw new Error('Configure the server-only authorized verifier key');
const account=process.env.BONDLINE_VERIFIER_PRIVATE_KEY?privateKeyToAccount(process.env.BONDLINE_VERIFIER_PRIVATE_KEY):undefined;
const wallet=account?createWalletClient({account,chain,transport:http(process.env.MONAD_RPC_URL)}):undefined;
const read=(functionName,args=[])=>client.readContract({address,abi,functionName,args});
if(await read('protocolVersion')!==2n)throw new Error('Worker requires protocol v2');
if(await client.getChainId()!==chain.id)throw new Error('Wrong RPC network');
if((await client.getCode({address}))==='0x')throw new Error('Core has no code');
const count=await read('bondCount');
async function send(functionName,args) {
  if(!broadcast) { console.log(JSON.stringify({action:functionName,args:args.map(String),broadcast:false}));return; }
  const gas=await client.estimateContractGas({account,address,abi,functionName,args});
  const hash=await wallet.writeContract({address,abi,functionName,args,gas:gas+gas/20n});
  const receipt=await client.waitForTransactionReceipt({hash});
  if(receipt.status!=='success')throw new Error('Settlement reverted');
  console.log(JSON.stringify({action:functionName,hash,status:receipt.status}));
}
for(let id=0n;id<count;id++) {
  try {
    const bond=await read('bonds',[id]);
    const now=(await client.getBlock()).timestamp;
    if(bond[5]===1&&now>=bond[4]) {await send('resolveExpired',[id]);continue;}
    if(bond[5]!==0)continue;
    if(now>=bond[3]) {await send('crossMissed',[id]);continue;}
    const [kind,verifier,target,conditionHash,createdAt]=await read('verification',[id]);
    if(kind===1) {
      if(await client.getBalance({address:bond[0]})>=target)await send('verifyBalance',[id]);
    } else if(kind===2&&(!account||account.address.toLowerCase()===verifier.toLowerCase())) {
      const raw=await read('verificationSpec',[id]);
      if(keccak256(toBytes(raw))!==conditionHash)throw new Error('Condition hash mismatch');
      const spec=parseGithubSpec(raw);
      const url=new URL(`https://api.github.com/repos/${spec.repo}/commits`);
      url.search=new URLSearchParams({author:spec.author,since:new Date(Number(createdAt)*1000).toISOString(),until:new Date(Number(now)*1000).toISOString(),per_page:'100'}).toString();
      const response=await fetch(url,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',...(process.env.GITHUB_VERIFIER_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_VERIFIER_TOKEN}`}:{})},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`GitHub unavailable (${response.status}); no attestation sent`);
      const commits=countCommits(await response.json(),spec,Number(createdAt),Number(bond[3]));
      if(commits.length>=spec.commits)await send('attest',[id,true,conditionHash,keccak256(toBytes(JSON.stringify({repo:spec.repo,author:spec.author,commits})))]);
    }
  } catch(error) { console.error(`Commitment ${id}: ${error.message}`);process.exitCode=1; }
}
