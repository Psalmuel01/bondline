import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {recoverMessageAddress,bytesToHex} from 'viem';
import {parseExternalSpec,verificationWindow,requiredProgress} from '../scripts/verifier-adapters.mjs';
import {createExecutionRequest,canonicalJson} from '../scripts/cre-gateway.mjs';

test('external adapters bind bounded rules to activation and allow configurable public repositories',()=>{
 const github=parseExternalSpec(JSON.stringify({type:'github',version:1,repo:'quikdb/quikdb-ops',author:'sam',commits:5,startTime:150}));
 assert.deepEqual(verificationWindow(github,100,200),{start:150,deadline:200});
 assert.equal(requiredProgress(github),5);
 assert.deepEqual(verificationWindow({...github,startTime:50},100,200),{start:100,deadline:200});
 assert.throws(()=>verificationWindow(github,100,140));
 const onchain={type:'onchain',version:1,rule:'contract-call',contract:'0x'+'1'.repeat(40),count:1};
 assert.equal(parseExternalSpec(JSON.stringify(onchain)).type,'onchain');
 for(const input of [{...onchain,contract:'https://evil.test'},{...onchain,contract:'0x'+'0'.repeat(40)},{...onchain,count:2},{...github,version:2},{...github,startTime:-1}])assert.throws(()=>parseExternalSpec(JSON.stringify(input)));
});
test('gateway JWT binds canonical request body, short expiry and recoverable authorized signer',async()=>{
 const request=await createExecutionRequest({workflowId:'a'.repeat(64),commitmentId:'7',privateKey:'0x'+'1'.repeat(64),now:1000,requestId:'request',jwtId:'nonce'});
 const [header,payload,sig]=request.token.split('.');
 const p=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(p.digest,'0x'+createHash('sha256').update(request.body).digest('hex'));
 assert.equal(p.exp,1120);assert.equal(p.jti,'nonce');
 assert.equal((await recoverMessageAddress({message:`${header}.${payload}`,signature:bytesToHex(Buffer.from(sig,'base64url'))})).toLowerCase(),p.iss.toLowerCase());
 assert.equal(canonicalJson({z:{b:1,a:2},a:3}),'{"a":3,"z":{"a":2,"b":1}}');
 await assert.rejects(createExecutionRequest({workflowId:'invalid',commitmentId:'7',privateKey:'0x'+'1'.repeat(64)}));
});
