import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
// Run with --env-file=.env.worker.local. Values are written only to an ignored,
// mode-0600 handoff file; never print this file or commit it.
const output=resolve(process.argv[2] ?? '.env.render-worker.local');
if(!/\.env\..*\.local$/.test(output) || existsSync(output))throw new Error('Choose a new ignored .env.*.local output file');
const keys=['BONDLINE_APP_URL','BONDLINE_VERIFICATION_WORKER_SECRET','NEXT_PUBLIC_CORE_ADDRESS','MONAD_RPC_URL','BONDLINE_VERIFIER_PRIVATE_KEY'];
if(keys.some(k=>!process.env[k]))throw new Error('Load the persistent worker environment first');
const values=keys.map(k=>`${k}=${process.env[k]}`);
values.push(`BONDLINE_CRE_LOGIN_BASE64=${readFileSync(join(homedir(),'.cre','cre.yaml')).toString('base64')}`);
writeFileSync(output,values.join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log(`Prepared private Render handoff file: ${output}. Import only into this worker service; never commit or paste it into chat.`);
