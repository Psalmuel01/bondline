import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createWorkerServer} from './worker-http.mjs';

test('public readiness is read-only; only authenticated POST can request a worker',async()=>{
 let starts=0;
 const secret='a'.repeat(40);
 const server=createWorkerServer({secret,startWorker:()=>starts++,getState:()=>({state:'starting'})});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  assert.equal((await fetch(base+'/healthz')).status,200);assert.equal(starts,0);
  assert.equal((await fetch(base+'/wake',{method:'POST'})).status,401);assert.equal(starts,0);
  assert.equal((await fetch(base+'/wake',{method:'POST',headers:{Authorization:`Bearer ${secret}x`}})).status,401);assert.equal(starts,0);
  assert.equal((await fetch(base+'/wake',{method:'POST',headers:{Authorization:`Bearer ${secret}`}})).status,202);assert.equal(starts,1);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
