import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const chainId=process.argv[2]||'10143';
if(!['10143','143'].includes(chainId))throw new Error('Unsupported chain');
const run=JSON.parse(readFileSync(new URL(`../../contracts/broadcast/Deploy.s.sol/${chainId}/run-latest.json`,import.meta.url),'utf8'));
const find=(name)=>run.transactions.find((tx)=>tx.contractName===name)?.contractAddress;
const core=find('BondlineCore'),factory=find('CircleFactory'),circle=find('Circle');
if(!core||!factory||!circle||!run.receipts?.length)throw new Error('Deployment receipts missing');
const deploymentBlock=Math.min(...run.receipts.map((r)=>Number(BigInt(r.blockNumber))));
const rpc=chainId==='10143'?'https://testnet-rpc.monad.xyz':'https://rpc.monad.xyz';
const updates={NEXT_PUBLIC_CORE_ADDRESS:core,NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS:factory,NEXT_PUBLIC_CHAIN_ID:chainId,NEXT_PUBLIC_PROTOCOL_VERSION:'2',BONDLINE_DEPLOYMENT_BLOCK:String(deploymentBlock),MONAD_RPC_URL:rpc,NEXT_PUBLIC_MONAD_RPC_URL:rpc,BONDLINE_HYPERSYNC_URL:chainId==='10143'?'https://monad-testnet.hypersync.xyz':'https://monad.hypersync.xyz'};
const envPath=new URL('../.env.local',import.meta.url);
let env=existsSync(envPath)?readFileSync(envPath,'utf8'):'';
for(const [key,value]of Object.entries(updates)){const re=new RegExp(`^${key}=.*$`,'m');env=re.test(env)?env.replace(re,`${key}=${value}`):`${env.trimEnd()}\n${key}=${value}\n`;}
writeFileSync(envPath,env);
const manifest={chainId:Number(chainId),protocolVersion:2,deploymentBlock,contracts:{core,factory,circleImplementation:circle},transactions:run.receipts.map((r)=>({hash:r.transactionHash,block:Number(BigInt(r.blockNumber)),status:r.status})),deployedAt:new Date().toISOString()};
writeFileSync(new URL(`../../docs/deployments/monad-${chainId==='10143'?'testnet':'mainnet'}.json`,import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
