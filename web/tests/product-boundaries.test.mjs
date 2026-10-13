import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
function moduleAt(path, require) {
  const module = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  runInNewContext(source, {
    module,
    exports: module.exports,
    require,
    Request,
    Response,
    URL,
    Set,
    Date,
    JSON,
    process: { env: {} },
    fetch: () => assert.fail("unexpected network"),
  });
  return module.exports;
}
const json = (value, options = {}) =>
  new Response(JSON.stringify(value), {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
const owner = "0x1234567890123456789012345678901234567890";
test("information export refuses unsigned requests before accessing private data", async () => {
  const route = moduleAt("../src/app/api/account/export/route.ts", (name) =>
    name === "next/server"
      ? { NextResponse: { json } }
      : name.includes("session")
        ? { getWalletSession: async () => null }
        : { supabaseAdminRequest: () => assert.fail("private data accessed") },
  );
  assert.equal((await route.GET()).status, 401);
});
test("information export scopes every private query to the signed-in author and paginates", async () => {
  const calls = [];
  const route = moduleAt("../src/app/api/account/export/route.ts", (name) =>
    name === "next/server"
      ? { NextResponse: { json } }
      : name.includes("session")
        ? { getWalletSession: async () => ({ address: owner }) }
        : {
            supabaseAdminRequest: async (path) => {
              calls.push(path);
              if (path.startsWith("profiles"))
                return [{ address: owner, display_name: "Owner" }];
              if (path.endsWith("offset=0"))
                return Array.from({ length: 500 }, (_, i) => ({
                  id: String(i),
                  sender_address: owner,
                  body: "private",
                }));
              return [{ id: "500", sender_address: owner, body: "last" }];
            },
          },
  );
  const response = await route.GET();
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.authoredMessages.length, 501);
  assert.equal(data.mayBeIncomplete, false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(calls.every((path) => path.includes(`eq.${owner}`)));
  assert.match(calls[2], /offset=500$/);
  assert.equal("session" in data, false);
});
test("activity endpoint rejects injected addresses and selects only configured-chain public events", async () => {
  const calls = [];
  const route = moduleAt("../src/app/api/activity/route.ts", (name) =>
    name === "next/server"
      ? { NextResponse: { json } }
      : name === "viem"
        ? { isAddress: (value) => /^0x[a-f0-9]{40}$/i.test(value) }
        : name.includes("chain")
          ? { monadMainnet: { id: 10143 } }
          : {
              supabaseAdminRequest: async (path) => {
                calls.push(path);
                return [];
              },
            },
  );
  assert.equal(
    (
      await route.GET(
        new Request(
          "https://bondline.example/api/activity?circles=0x123,profiles",
        ),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (
      await route.GET(
        new Request(`https://bondline.example/api/activity?circles=${owner}`),
      )
    ).status,
    200,
  );
  assert.match(calls[0], /^chain_events\?/);
  assert.match(calls[0], /chain_id=eq.10143/);
  assert.doesNotMatch(calls[0], /circle_messages/);
});
test("event notifications do not infer ownership or promise a claimable reward", () => {
  const { eventNotification } = moduleAt(
    "../src/lib/notification-events.ts",
    () => assert.fail("unexpected dependency"),
  );
  const event = { event_name: "CommitmentBacked", bond_id: "1" };
  assert.equal(eventNotification(event, new Set(["2"])), null);
  assert.match(eventNotification(event, new Set(["1"])).title, /backed/);
  const settled = eventNotification(
    { ...event, event_name: "BondResolved", payload: { status: 2 } },
    new Set(["1"]),
  );
  assert.equal(settled.history, true);
  assert.match(settled.body, /credited/);
  const reward = eventNotification(
    { ...event, event_name: "PotPeriodClosed" },
    new Set(),
  );
  assert.match(reward.body, /any share/);
});
