import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {restoreCreSession} from './cre-session.mjs';

// An inbound request can wake a free Render web service. Merely polling the
// outbound queue cannot. Never create a new ephemeral signer on a hosted boot.
export function createWorkerServer({secret,startWorker,getState}) {
 if(!secret || secret.length<32) throw new Error('Configure a worker authentication secret');
 return createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  if(req.url==='/healthz' && req.method==='GET') {
   res.writeHead(200);res.end(JSON.stringify({service:'bondline-verifier',...getState()}));return;
  }
  if(req.url!=='/wake' || req.method!=='POST') {res.writeHead(404);res.end('{}');return;}
  const token=req.headers.authorization?.replace(/^Bearer /,'') ?? '';
  if(Buffer.byteLength(token)!==Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(token),Buffer.from(secret))) {res.writeHead(401);res.end('{}');return;}
  startWorker();res.writeHead(202);res.end(JSON.stringify({accepted:true,...getState()}));
 });
}

export function main() {
 if(!/^0x[0-9a-fA-F]{64}$/.test(process.env.BONDLINE_VERIFIER_PRIVATE_KEY ?? '')) throw new Error('Hosted verification requires a persistent service key');
 const secret=process.env.BONDLINE_VERIFICATION_WORKER_SECRET;
 let child,starting=false,stopping=false,state='starting';
 async function startWorker() {
  if(child || starting || stopping)return;
  starting=true;
  state='starting';
  try {await restoreCreSession();}
  catch {starting=false;state='unavailable';console.error('CRE login session unavailable. Check encrypted session storage and bootstrap configuration.');return;}
  starting=false;
  if(stopping)return;
  child=spawn(process.execPath,[fileURLToPath(new URL('./product-worker.mjs',import.meta.url))],{stdio:'inherit',env:{...process.env,BONDLINE_VERIFICATION_EPHEMERAL_SIGNER:'false'}});
  child.once('spawn',()=>{state='running';});
  child.once('error',()=>{state='unavailable';console.error('Worker could not start. Check runtime configuration.');});
  child.once('exit',code=>{
   child=undefined;state='unavailable';
   if(!stopping) {console.error(JSON.stringify({event:'worker-exited',code}));setTimeout(startWorker,15000).unref();}
  });
 }
 const server=createWorkerServer({secret,startWorker,getState:()=>({state})});
 server.listen(Number(process.env.PORT ?? 10000),'0.0.0.0',()=>{console.log('Bondline wake endpoint listening. Free hosting can sleep; deadline checks are not guaranteed.');startWorker();});
 function stop() {if(stopping)return;stopping=true;server.close();if(child)child.kill('SIGTERM');setTimeout(()=>{if(child)child.kill('SIGKILL');process.exit(0);},20000).unref();}
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
 return server;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
