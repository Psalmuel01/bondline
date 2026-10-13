import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {runInNewContext} from 'node:vm';import ts from 'typescript';
import {parseAbi,encodeEventTopics,encodeAbiParameters,decodeEventLog} from 'viem';
const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/event-filter.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:createRequire(import.meta.url)});
const {selectAbiEventLogs}=module.exports;
const abi=parseAbi(['event Initialized(uint64 version)','event CircleJoined(address indexed member)','event MemberInvited(address indexed member, address indexed inviter)','event PotFunded(address indexed from, uint256 amount, uint256 newBalance)']);
const membership=abi.filter((e)=>['CircleJoined','MemberInvited'].includes(e.name));
const member='0x0000000000000000000000000000000000000001';
test('Circle initialization cannot block membership indexing',()=>{
 const init={topics:encodeEventTopics({abi,eventName:'Initialized'}),data:encodeAbiParameters([{type:'uint64'}],[1n])};
 const join={topics:encodeEventTopics({abi,eventName:'CircleJoined',args:{member}}),data:'0x'};
 const selected=selectAbiEventLogs([init,join],membership);
 assert.equal(selected.length,1);assert.equal(decodeEventLog({abi:membership,...selected[0],strict:true}).eventName,'CircleJoined');
});
test('selected event payloads still undergo strict decoding',()=>{
 const malformed={topics:encodeEventTopics({abi,eventName:'CircleJoined'}),data:'0x'};
 const selected=selectAbiEventLogs([malformed],membership);assert.equal(selected.length,1);
 assert.throws(()=>decodeEventLog({abi:membership,...selected[0],strict:true}));
});
