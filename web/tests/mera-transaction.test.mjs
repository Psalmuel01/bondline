import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {monadTestnet} from 'viem/chains';
import {parseTransaction,recoverTransactionAddress} from 'viem';
import {createSecp256k1SigningSession} from '@category-labs/mera';
import {toViemAccount} from '@category-labs/mera/viem';
const module={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/mera-transaction.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:createRequire(import.meta.url)});
const {prepareMeraTransaction}=module.exports;
const sender='0x0000000000000000000000000000000000000001';
const destination='0x27c527934b115e64eed61c5f783a1060b540a6c4';
const client=(overrides={})=>({getChainId:async()=>10143,getTransactionCount:async()=>7,estimateFeesPerGas:async()=>({maxFeePerGas:200000000000n,maxPriorityFeePerGas:1000000000n}),getBalance:async()=>10n**18n,estimateGas:async()=>500000n,...overrides});
test('preserves explicit gas, nonce and legacy fees rather than discarding wallet fields',async()=>{
 const tx=await prepareMeraTransaction(client(),monadTestnet,sender,{from:sender,to:destination,gas:'0x7a120',nonce:'0x9',gasPrice:'0x2',data:'0x1234'});
 assert.equal(tx.gas,500000n);assert.equal(tx.nonce,9);assert.equal(tx.gasPrice,2n);assert.equal(tx.type,'legacy');assert.equal(tx.data,'0x1234');
});
test('unfunded account and mismatched RPC fail before signing',async()=>{
 await assert.rejects(()=>prepareMeraTransaction(client({getBalance:async()=>0n}),monadTestnet,sender,{to:destination,gas:'0x7a120'}),/needs more test MON/);
 await assert.rejects(()=>prepareMeraTransaction(client({getChainId:async()=>143}),monadTestnet,sender,{to:destination}),/wrong network/);
 await assert.rejects(()=>prepareMeraTransaction(client(),monadTestnet,sender,{to:destination,from:destination}),/Account does not match/);
});
test('prepared EIP-1559 transaction signs through Mera and recovers the same sender',async()=>{
 const key=new Uint8Array(32);key[31]=1;const session=createSecp256k1SigningSession({privateKey:key});key.fill(0);
 const account=toViemAccount(session);
 try{
  const tx=await prepareMeraTransaction(client(),monadTestnet,account.address,{from:account.address,to:destination,data:'0x1234',gas:'0x7a120',value:'0x0'});
  const signed=await account.signTransaction(tx);const decoded=parseTransaction(signed);
  assert.equal(decoded.chainId,10143);assert.equal(decoded.nonce,7);assert.equal(decoded.gas,500000n);assert.equal(decoded.data,'0x1234');
  assert.equal((await recoverTransactionAddress({serializedTransaction:signed})).toLowerCase(),account.address.toLowerCase());
 }finally{session.end();}
 await assert.rejects(()=>account.signMessage({message:'ended'}));
});
