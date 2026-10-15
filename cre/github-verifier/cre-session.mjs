import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

const keyFor=secret=>createHash('sha256').update(`bondline-cre-session-v1:${secret}`).digest();
export function sealSession(value,secret) {
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyFor(secret),iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return JSON.stringify({version:1,iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),data:encrypted.toString('base64')});
}
export function openSession(value,secret) {
 const data=JSON.parse(value);
 if(data.version!==1 || !/^[a-f0-9]{24}$/.test(data.iv) || !/^[a-f0-9]{32}$/.test(data.tag))throw new Error('Invalid encrypted session');
 const cipher=createDecipheriv('aes-256-gcm',keyFor(secret),Buffer.from(data.iv,'hex'));
 cipher.setAuthTag(Buffer.from(data.tag,'hex'));
 return Buffer.concat([cipher.update(Buffer.from(data.data,'base64')),cipher.final()]).toString('utf8');
}
const path=()=>join(homedir(),'.cre','cre.yaml');
async function request(method,body) {
 const response=await fetch(new URL('/api/verification/runtime-session',process.env.BONDLINE_APP_URL),{method,redirect:'error',headers:{Authorization:`Bearer ${process.env.BONDLINE_VERIFICATION_WORKER_SECRET}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});
 if(response.status===404 && method==='GET')return null;
 if(!response.ok)throw new Error('CRE session persistence unavailable');
 return response.json();
}
let saved;
export async function restoreCreSession() {
 const stored=await request('GET');
 const value=stored?.ciphertext?openSession(stored.ciphertext,process.env.BONDLINE_VERIFICATION_WORKER_SECRET):process.env.BONDLINE_CRE_LOGIN_BASE64?Buffer.from(process.env.BONDLINE_CRE_LOGIN_BASE64,'base64').toString('utf8'):null;
 if(!value)throw new Error('Initialize a CRE login session before hosted verification');
 mkdirSync(join(homedir(),'.cre'),{recursive:true,mode:0o700});
 writeFileSync(path(),value,{mode:0o600});
 await persistCreSession();
 delete process.env.BONDLINE_CRE_LOGIN_BASE64;
}
export async function persistCreSession() {
 if(process.env.BONDLINE_CRE_SESSION_PERSISTENCE!=='true' || !existsSync(path()))return;
 const value=readFileSync(path(),'utf8');
 if(value===saved)return;
 await request('POST',JSON.stringify({ciphertext:sealSession(value,process.env.BONDLINE_VERIFICATION_WORKER_SECRET)}));saved=value;
}
