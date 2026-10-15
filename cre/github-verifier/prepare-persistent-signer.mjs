import {writeFileSync,existsSync,chmodSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {privateKeyToAccount,generatePrivateKey} from 'viem/accounts';

const path=resolve(process.argv[2] ?? '.env.worker.local');
if(!/\.env\..*\.local$/.test(path)) throw new Error('Use an ignored .env.*.local file');
if(existsSync(path)) {
 const key=readFileSync(path,'utf8').match(/^BONDLINE_VERIFIER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
 if(!key)throw new Error('Existing file has no valid signer; refusing to overwrite it');
 chmodSync(path,0o600);
 console.log(JSON.stringify({verifier:privateKeyToAccount(key).address,path,created:false}));
} else {
 const key=generatePrivateKey();
 const allowed=['BONDLINE_APP_URL','BONDLINE_VERIFICATION_WORKER_SECRET','NEXT_PUBLIC_CORE_ADDRESS','MONAD_RPC_URL','CRE_CLI_PATH'];
 const values=allowed.filter(k=>process.env[k]).map(k=>`${k}=${JSON.stringify(process.env[k])}`);
 values.push(`BONDLINE_VERIFIER_PRIVATE_KEY=${key}`,'BONDLINE_VERIFICATION_EPHEMERAL_SIGNER=false');
 writeFileSync(path,values.join('\n')+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({verifier:privateKeyToAccount(key).address,path,created:true,note:'Back up securely. Do not commit or share this file.'}));
}
