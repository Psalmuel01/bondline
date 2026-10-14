// Reproducible CLI fixture. Every mutation is guarded by loopback + Anvil +
// chain 31337. No user key, public transaction, or fabricated GitHub response.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createPublicClient, createWalletClient, defineChain, http, parseEther, toHex, keccak256, toBytes, getAddress, encodeDeployData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
const rpc = new URL(process.env.CRE_LOCAL_RPC_URL || "http://127.0.0.1:8551");
if (rpc.href !== "http://127.0.0.1:8551/") throw Error("This fixture only supports the checked-in loopback RPC at port 8551.");
const chain = defineChain({ id: 31337, name: "Local CRE Monad fork", nativeCurrency: { name: "Local test MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [rpc.href] } } });
const client = createPublicClient({ chain, transport: http(rpc.href) });
if (await client.getChainId() !== 31337 || !(await client.request({ method: "web3_clientVersion" })).toLowerCase().includes("anvil")) throw Error("Local Anvil chain31337 required. No mutations attempted.");
const manifest = JSON.parse(readFileSync(new URL("../../docs/deployments/monad-testnet.json", import.meta.url)));
const core = manifest.contracts.core, factory = manifest.contracts.factory;
const artifact = (name) => JSON.parse(readFileSync(new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url)));
const coreAbi = artifact("BondlineCore").abi, factoryAbi = artifact("CircleFactory").abi;
const read = (functionName, args = []) => client.readContract({ address: core, abi: coreAbi, functionName, args });
assert.equal(await read("protocolVersion"), 2n);
const mode = process.argv[2] || "prepare";
const stateFile = new URL("./simulation.local.json", import.meta.url);
const configFile = new URL("./config.simulation.local.json", import.meta.url);
const emptyEnvFile = new URL("./simulator.local.env", import.meta.url);
const mockForwarder = "0xB9F79d863261869B234c481D1f9A7af84AeAd192";
const alice = getAddress("0x" + keccak256(toBytes("bondline-cre-local-fixture-alice-v1")).slice(-40));
const bob = getAddress("0x" + keccak256(toBytes("bondline-cre-local-fixture-bob-v1")).slice(-40));
const receipts = [];
async function unlock(account) {
  await client.request({ method: "anvil_setBalance", params: [account, toHex(parseEther("100"))] });
  await client.request({ method: "anvil_impersonateAccount", params: [account] });
}
async function send(account, address, abi, functionName, args = [], value = 0n) {
  const gas = await client.estimateContractGas({ account, address, abi, functionName, args, value });
  const wallet = createWalletClient({ chain, account, transport: http(rpc.href) });
  const hash = await wallet.writeContract({ address, abi, functionName, args, value, gas: gas + gas / 20n });
  const receipt = await client.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, "success"); receipts.push({ functionName, hash }); return receipt;
}
if (mode === "prepare") {
  if (!await client.getCode({ address: mockForwarder })) throw Error("Official simulation forwarder is absent from this fork.");
  const authority = await read("deployer");
  for (const account of [authority, alice, bob]) await unlock(account);
  // CRE's well-known default simulator sender may have EIP-7702 code on the
  // public fork. Clear it ONLY on our guarded local fork and give test balance.
  const simulatorSender = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  await client.request({ method: "anvil_setCode", params: [simulatorSender, "0x"] }); await unlock(simulatorSender);
  const a = artifact("LocalCREReceiver");
  const data = encodeDeployData({ abi: a.abi, bytecode: a.bytecode.object, args: [core, mockForwarder] });
  const gas = await client.estimateGas({ account: alice, data });
  const wallet = createWalletClient({ chain, account: alice, transport: http(rpc.href) });
  const hash = await wallet.sendTransaction({ data, gas: gas + gas / 20n }); const deployed = await client.waitForTransactionReceipt({ hash }); assert.equal(deployed.status, "success");
  const receiver = deployed.contractAddress; assert.ok(receiver);
  await send(authority, core, coreAbi, "setTrustedVerifier", [receiver, true]);
  await send(alice, factory, factoryAbi, "createCircle", ["[LOCAL SIMULATION] CRE verification", [alice, bob], 5000]);
  const circles = await client.readContract({ address: factory, abi: factoryAbi, functionName: "allCircles" }); const circle = circles.at(-1);
  const start = Number((await client.getBlock()).timestamp), deadline = start + 86400;
  const goals = [];
  for (const [title, commits] of [["Publish the CRE local simulation tooling", 1], ["An unfinished condition waits, then misses its deadline", 100]]) {
    const id = await read("bondCount"), spec = JSON.stringify({ type: "github", repo: "Psalmuel01/bondline", author: "Psalmuel01", commits });
    await send(alice, core, coreAbi, "openVerifiedBond", [circle, `[LOCAL SIMULATION] ${title}`, BigInt(deadline), 2, receiver, 0n, spec], parseEther("0.01"));
    goals.push({ id: String(id), commits, title });
  }
  const state = { scope: "LOCAL ANVIL ONLY; NOT LIVE MONAD OR HUMAN TRACTION", chainId: 31337, core, circle, receiver, mockForwarder, alice, start, deadline, goals, setupReceipts: receipts };
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  writeFileSync(configFile, JSON.stringify({ schedule: "0 */1 * * * *", coreAddress: core, receiverAddress: receiver, commitmentIds: goals.map((g) => g.id), reportGasLimit: "400000" }, null, 2));
  console.log(JSON.stringify({ ...state, next: "Publish a genuine GitHub commit after this fixture's start, then run cli and inspect. Do not reuse this config for deployment." }, null, 2));
} else {
  const state = JSON.parse(readFileSync(stateFile));
  assert.equal(state.core.toLowerCase(), core.toLowerCase());
  if (mode === "expire") {
    await client.request({ method: "evm_setNextBlockTimestamp", params: [state.deadline + 1] }); await client.request({ method: "evm_mine", params: [] });
    console.log("Advanced LOCAL fixture past deadline; no public clock or contract changed.");
  } else if (mode === "inspect") {
    const bonds = await Promise.all(state.goals.map(async (goal) => { const b = await read("bonds", [BigInt(goal.id)]); return { ...goal, status: b[5], stakeWei: String(b[2]) }; }));
    console.log(JSON.stringify({ scope: state.scope, bonds, circlePotWei: String(await client.getBalance({ address: state.circle })), reservedPotWei: String(await read("reservedPot", [state.circle])) }, null, 2));
  } else if (mode === "cli") {
    const cli = process.env.CRE_CLI_PATH || "cre";
    // Ensure the broadcast target remains exactly local even if YAML is edited.
    const project = readFileSync(new URL("../project.yaml", import.meta.url), "utf8");
    const target = project.split("\nlocal-simulation:")[1];
    if (!target || !target.includes('url: "http://127.0.0.1:8551"') || (target.match(/url:/g) || []).length !== 1) throw Error("Local simulation target was changed. Refusing CLI broadcast.");
    // Public, deterministic test material, NOT a secret or a user's key. The
    // CLI requires an explicit key even for local broadcasting. Guarded above
    // before funding; never persisted to an env file or usable public funds.
    const fixtureKey = keccak256(toBytes("bondline-PUBLIC-LOCAL-SIMULATION-ONLY-key-v1"));
    const fixtureSender = privateKeyToAccount(fixtureKey).address;
    if (await client.getCode({ address: fixtureSender })) throw Error("Local CLI fixture sender unexpectedly has code.");
    await unlock(fixtureSender);
    const env = { ...process.env, CRE_ETH_PRIVATE_KEY: fixtureKey.slice(2) };
    writeFileSync(emptyEnvFile, "# No user key. Only the guarded runner supplies PUBLIC deterministic test material in memory.\n", { mode: 0o600 });
    const run = spawnSync(cli, ["workflow", "simulate", "github-verifier", "--target", "local-simulation", "--env", emptyEnvFile.pathname, "--non-interactive", "--trigger-index", "0", "--broadcast"], { cwd: new URL("../", import.meta.url), env, stdio: "inherit" });
    process.exitCode = run.status ?? 1;
  } else throw Error("Use prepare, cli, inspect or expire.");
}
