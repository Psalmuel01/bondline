import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGithubSpec,countCommits} from '../scripts/verification.mjs';
const spec={type:'github',repo:'sam/bondline',author:'sam',commits:3};
const item=(char,date,author='sam')=>({sha:char.repeat(40),author:{login:author},commit:{author:{date}}});
test('fixed GitHub API condition forbids URL injection and unbounded targets',()=>{
 assert.deepEqual(parseGithubSpec(JSON.stringify(spec)),spec);
 for(const input of [{...spec,repo:'https://evil.test/x'},{...spec,repo:'../repo'},{...spec,commits:0},{...spec,commits:101},{...spec,author:'x&since=0'}])assert.throws(()=>parseGithubSpec(JSON.stringify(input)));
});
test('unique author commits inside the immutable interval; exact deadline excluded',()=>{
 const start=Date.parse('2026-10-13T00:00:00Z')/1000,end=start+3600;
 const a=item('a','2026-10-13T00:00:00Z');
 assert.deepEqual(countCommits([a,a,item('b','2026-10-13T01:00:00Z'),item('c','2026-10-13T00:30:00Z','other'),item('d','2026-10-12T23:59:59Z')],spec,start,end),['a'.repeat(40)]);
});
test('malformed external responses fail closed',()=>{
 for(const data of [{error:'rate limit'},[{sha:'bad'}],[item('a','invalid')]])assert.throws(()=>countCommits(data,spec,0,100));
});
