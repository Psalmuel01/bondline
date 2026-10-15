import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/app/api/verification/[id]/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({session=true,member=true,hash='0x'+'1'.repeat(64),kind=2,status=0,onDemand=false,online=false,job,queued=true}={}) {
 const calls=[],afterCalls=[];const module={exports:{}};
 const api={getWalletSession:async()=>session?{address:'0x'+'a'.repeat(40)}:undefined,isCircleMember:async()=>member,productConfigured:()=>true,workerAvailable:async()=>online,workerWakeConfigured:()=>onDemand,wakeVerificationWorker:async()=>{},after:fn=>afterCalls.push(fn),readVerification:async()=>({bond:['0x'+'b'.repeat(40),'0x'+'c'.repeat(40),1n,9999999999n,0n,status],rule:[kind,'0x'+'d'.repeat(40),0n,hash,1n],spec:{type:'github'}}),finalPhase:s=>s===2?'verified':s===3?'failed':undefined,getJob:async()=>job,enqueueVerification:async(...args)=>{calls.push(args);return queued;}};
 runInNewContext(source,{module,exports:module.exports,require:()=>api,Response,URL,Date,BigInt,process:{env:{NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS:'0x'+'d'.repeat(40)}}});return {api:module.exports,calls,afterCalls};
}
const request=(body={},origin='https://bondline.example')=>new Request('https://bondline.example/api/verification/7',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const context={params:Promise.resolve({id:'7'})};
test('app verification rejects unauthenticated users and cross-origin requests before queuing',async()=>{
 const f=fixture({session:false});assert.equal((await f.api.POST(request(),context)).status,401);assert.equal(f.calls.length,0);
 const g=fixture();assert.equal((await g.api.POST(request({},'https://evil.example'),context)).status,403);assert.equal(g.calls.length,0);
});
test('only creator or authorized Circle member can queue immutable verifier checks',async()=>{
 const f=fixture({member:false});assert.equal((await f.api.POST(request(),context)).status,403);assert.equal(f.calls.length,0);
 const g=fixture();assert.equal((await g.api.POST(request(),context)).status,202);assert.deepEqual(g.calls[0],['7','0x'+'1'.repeat(64),undefined]);
});
test('browser-supplied success/config cannot authorize settlement; settled goals never requeue',async()=>{
 const f=fixture();assert.equal((await f.api.POST(request({success:true,conditionHash:'fake'}),context)).status,400);assert.equal(f.calls.length,0);
 const g=fixture({status:2});assert.equal((await g.api.POST(request(),context)).status,200);assert.equal(g.calls.length,0);
 const h=fixture({kind:1});assert.equal((await h.api.POST(request(),context)).status,409);assert.equal(h.calls.length,0);
});
test('sleeping host wakes only after an authorized request is durably queued',async()=>{
 const f=fixture({session:false,onDemand:true});assert.equal((await f.api.POST(request(),context)).status,401);assert.equal(f.afterCalls.length,0);
 const g=fixture({onDemand:true});assert.equal((await g.api.POST(request(),context)).status,202);assert.equal(g.calls.length,1);assert.equal(g.afterCalls.length,1);
 const h=fixture({onDemand:true,queued:false});assert.equal((await h.api.POST(request(),context)).status,429);assert.equal(h.afterCalls.length,1);
});
test('pending sleeping-host status explains startup without fabricating progress',async()=>{
 const f=fixture({onDemand:true,job:{phase:'queued',requested_at:new Date().toISOString()}});
 const body=await (await f.api.GET(request(),context)).json();
 assert.equal(body.workerState,'starting');assert.equal(body.available,true);assert.equal(body.status,'queued');assert.equal(body.result,null);assert.equal(f.afterCalls.length,1);
 const g=fixture({onDemand:true,status:2,job:{phase:'verified'}});assert.equal((await (await g.api.GET(request(),context)).json()).status,'verified');assert.equal(g.afterCalls.length,0);
});
