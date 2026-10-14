import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as mera from "@category-labs/mera";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/journal.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  {
    module,
    exports: module.exports,
    require: () => mera,
    TextEncoder,
    TextDecoder,
    Date,
    Set,
    JSON,
    Number,
  },
);
const {
  encryptJournal,
  decryptJournal,
  parseJournalEnvelope,
  parseJournalDocument,
} = module.exports;
const owner = "0x1111111111111111111111111111111111111111";
const credential = {
  credentialId: Buffer.from("test-credential").toString("base64url"),
};
const doc = {
  version: 1,
  entries: [
    {
      id: "one",
      createdAt: "2026-10-14T00:00:00Z",
      updatedAt: "2026-10-14T00:00:00Z",
      title: "A private goal",
      body: "My reflection must never be stored as plaintext.",
    },
  ],
};
function authenticator() {
  const salts = [];
  return {
    salts,
    client: {
      createCredential: async () =>
        assert.fail("must reuse the account passkey"),
      getCredential: async (request) => {
        assert.equal(request.userVerification, "required");
        assert.deepEqual(
          Buffer.from(request.allowCredential.credentialId),
          Buffer.from("test-credential"),
        );
        salts.push(Buffer.from(request.prfSalt));
        return {
          credentialId: Buffer.from("test-credential"),
          prfOutput: new Uint8Array(
            createHmac("sha256", "isolated test authenticator secret")
              .update(request.prfSalt)
              .digest(),
          ),
        };
      },
    },
  };
}
test("Mera journal encrypts, restores with the same passkey, and randomizes every saved vault", async () => {
  const a = authenticator();
  const first = await encryptJournal(
    doc,
    owner,
    10143,
    "bondline.example",
    credential,
    a.client,
  );
  const second = await encryptJournal(
    doc,
    owner,
    10143,
    "bondline.example",
    credential,
    a.client,
  );
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes(doc.entries[0].body), false);
  assert.equal(serialized.includes(doc.entries[0].title), false);
  assert.notEqual(first.vault.prfSalt, second.vault.prfSalt);
  assert.notEqual(first.vault.nonce, second.vault.nonce);
  assert.notEqual(first.vault.ciphertext, second.vault.ciphertext);
  const restored = await decryptJournal(
    parseJournalEnvelope(serialized, owner, 10143, "bondline.example"),
    credential,
    a.client,
  );
  assert.deepEqual(restored, doc);
  assert.deepEqual(a.salts[0], a.salts[2]);
});
test("journal authentication rejects ciphertext tampering and a different credential", async () => {
  const a = authenticator();
  const vault = await encryptJournal(
    doc,
    owner,
    10143,
    "bondline.example",
    credential,
    a.client,
  );
  const bad = structuredClone(vault);
  const bytes = Buffer.from(bad.vault.ciphertext, "base64url");
  bytes[0] ^= 1;
  bad.vault.ciphertext = bytes.toString("base64url");
  await assert.rejects(() => decryptJournal(bad, credential, a.client));
  const count = a.salts.length;
  await assert.rejects(
    () => decryptJournal(vault, { credentialId: "different" }, a.client),
    /signed-in account/,
  );
  assert.equal(a.salts.length, count);
});
test("journal backups cannot cross accounts, domains or networks and entries are bounded", async () => {
  const a = authenticator();
  const saved = await encryptJournal(
    doc,
    owner,
    10143,
    "bondline.example",
    credential,
    a.client,
  );
  for (const args of [
    [owner, 143, "bondline.example"],
    ["0x2222222222222222222222222222222222222222", 10143, "bondline.example"],
    [owner, 10143, "preview.example"],
  ])
    assert.throws(
      () => parseJournalEnvelope(JSON.stringify(saved), ...args),
      /different account/,
    );
  assert.throws(() =>
    parseJournalDocument({ ...doc, entries: [...doc.entries, ...doc.entries] }),
  );
  assert.throws(() =>
    parseJournalDocument({
      ...doc,
      entries: [{ ...doc.entries[0], body: "x".repeat(8001) }],
    }),
  );
});
