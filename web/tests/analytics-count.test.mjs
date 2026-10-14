import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/lib/server/supabase-admin.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function client(fetch) {
  const module = { exports: {} };
  runInNewContext(source, { module, exports: module.exports, require: () => ({}), fetch, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-key' } } });
  return module.exports;
}
test('Circle join analytics requests an exact count without retrieving row-limited event data', async () => {
  const { supabaseAdminCount } = client(async (url, init) => {
    assert.match(url, /chain_id=eq.10143&event_name=eq.CircleJoined$/);
    assert.equal(init.method, 'HEAD');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Prefer, 'count=exact');
    return new Response(null, { headers: { 'content-range': '*/25000' } });
  });
  assert.equal(await supabaseAdminCount('chain_events?select=event_name&chain_id=eq.10143&event_name=eq.CircleJoined'), 25000);
});
test('missing or failed aggregate counts never become a fabricated zero', async () => {
  for (const response of [new Response(null), new Response(null, { status: 401 }), new Response(null, { headers: { 'content-range': '*/9007199254740993' } })]) {
    const { supabaseAdminCount } = client(async () => response);
    await assert.rejects(() => supabaseAdminCount('chain_events?select=event_name'));
  }
  const { supabaseAdminCount } = client(async () => new Response(null, { headers: { 'content-range': '*/0' } }));
  assert.equal(await supabaseAdminCount('chain_events?select=event_name'), 0);
});
