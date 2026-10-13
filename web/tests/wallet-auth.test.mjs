import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = ts.transpileModule(readFileSync(new URL("../src/lib/wallet-auth.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetch) { const module = { exports: {} }; runInNewContext(source, { module, exports: module.exports, fetch }); return module.exports.authenticateWallet; }
const address = "0x1234567890123456789012345678901234567890";
test("auth signs one server challenge and verifies the same account", async () => {
  const requests = []; let signatures = 0;
  const auth = load(async (path, options) => { requests.push([path, JSON.parse(options.body)]); return { ok: true, json: async () => path.endsWith("challenge") ? { message: "server nonce" } : { address } }; });
  assert.equal(await auth(address, async message => { signatures++; assert.equal(message, "server nonce"); return "0xab"; }), address);
  assert.equal(signatures, 1);
  assert.deepEqual(requests[1], ["/api/auth/verify", { address, message: "server nonce", signature: "0xab" }]);
});
test("failed challenge never asks the account to sign", async () => {
  const auth = load(async () => ({ ok: false, json: async () => ({ error: "Service unavailable" }) }));
  await assert.rejects(auth(address, async () => assert.fail("must not sign")), /Service unavailable/);
});
test("session for another account is rejected", async () => {
  const auth = load(async path => ({ ok: true, json: async () => path.endsWith("challenge") ? { message: "nonce" } : { address: "0xother" } }));
  await assert.rejects(auth(address, async () => "0xab"), /does not match/);
});
