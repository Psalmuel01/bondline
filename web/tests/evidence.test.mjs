import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/evidence.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { module, exports: module.exports, URL },
);
const { evidenceUrl } = module.exports;
test("evidence accepts a real web URL but never an executable or local-file scheme", () => {
  assert.equal(evidenceUrl("https://example.org/proof").protocol, "https:");
  for (const input of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///private/secret",
    "not a URL",
    "https://",
  ])
    assert.equal(evidenceUrl(input), undefined);
});
test("unbounded evidence links are rejected without changing a submitted URI string", () => {
  const original = "https://example.org/proof?token=value#section";
  assert.equal(evidenceUrl(original).href, original);
  assert.equal(
    evidenceUrl("https://example.org/" + "a".repeat(2048)),
    undefined,
  );
});
