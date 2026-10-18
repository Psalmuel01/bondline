import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sealSession,openSession} from './cre-session.mjs';
test('CRE login encryption round-trips and rejects a different key or tampering',()=>{
 const secret='a'.repeat(40),value='test-only credential fixture';
 const sealed=sealSession(value,secret);
 assert.equal(openSession(sealed,secret),value);
 assert.equal(sealed.includes(value),false);
 assert.throws(()=>openSession(sealed,'b'.repeat(40)));
 const altered=JSON.parse(sealed);altered.tag='0'.repeat(32);
 assert.throws(()=>openSession(JSON.stringify(altered),secret));
});
