import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import ts from 'typescript';
const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/review-notification.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});
const {evidenceNotification}=module.exports;
const open={backed:true,responded:false,eligible:true,closesAt:200n,now:100000};
test('supporter gets evidence-ready notification, not a second backing request',()=>{assert.match(evidenceNotification(open),/commitment you backed/);});
test('recorded reviewer and closed review window are never nudged again',()=>{assert.equal(evidenceNotification({...open,responded:true}),null);assert.equal(evidenceNotification({...open,now:200000}),null);});
test('non-supporting eligible member can review; newly added non-reviewer is not asked to vote',()=>{assert.equal(evidenceNotification({...open,backed:false}),'Evidence needs your review');assert.equal(evidenceNotification({...open,backed:false,eligible:false}),null);});
