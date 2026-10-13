"use client";

import { createConnector } from "wagmi";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { createPasskeyWithPrfOutput, getPasskeyPrfOutput, createSecp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { prepareMeraTransaction, sendMeraTransaction } from "./mera-transaction";
import { monadMainnet } from "./chain";

const credentialKey = "bondline.mera.credential.v1";
const rpId = () => process.env.NEXT_PUBLIC_MERA_RP_ID || window.location.hostname;
let creating = false;
export function createMeraAccountOnNextConnect() { creating = true; }

async function ceremony() {
  const known = localStorage.getItem(credentialKey);
  const create = creating;
  creating = false;
  const result = create
    ? await createPasskeyWithPrfOutput({ rp: { id: rpId(), name: "Bondline" }, user: { name: crypto.randomUUID(), displayName: "Bondline member" } })
    : await getPasskeyPrfOutput({ rpId: rpId(), credential: known ? JSON.parse(known) : undefined });
  localStorage.setItem(credentialKey, JSON.stringify({ credentialId: result.credentialId }));
  return result.prfOutput;
}

async function withAccount<T>(run: (account: ReturnType<typeof toViemAccount>) => Promise<T>): Promise<T> {
  const entropy = await ceremony();
  const seed = mnemonicToSeedSync(entropyToMnemonic(entropy, wordlist));
  entropy.fill(0);
  const root = HDKey.fromMasterSeed(seed);
  seed.fill(0);
  const child = root.derive("m/44'/60'/0'/0/0");
  const key = child.privateKey;
  if (!key) throw new Error("Could not open your account.");
  const session = createSecp256k1SigningSession({ privateKey: key });
  key.fill(0);
  root.wipePrivateData();
  child.wipePrivateData();
  try { return await run(toViemAccount(session)); }
  finally { session.end(); }
}

/** Only credential metadata persists. Every signature gets its own passkey ceremony. */
export function meraConnector() {
  return createConnector((config) => {
    let address: Address | undefined;
    const publicClient = createPublicClient({ chain: monadMainnet, transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL) });
    const provider = {
      async request({ method, params = [] }: { method: string; params?: readonly unknown[] }) {
        if (method === "eth_chainId") return `0x${monadMainnet.id.toString(16)}`;
        if (method === "eth_accounts" || method === "eth_requestAccounts") return address ? [address] : [];
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "personal_sign") return withAccount(async (account) => {
          if (account.address.toLowerCase() !== address?.toLowerCase()) throw new Error("Please sign in with the same passkey.");
          return account.signMessage({ message: { raw: params[0] as Hex } });
        });
        if (method === "eth_sendTransaction" || method === "wallet_sendTransaction") {
          if (!address) throw new Error("Sign in to confirm this action.");
          const tx = params[0] as Record<string, Hex> | undefined;
          if (!tx) throw new Error("The transaction request is missing.");
          const transaction = await prepareMeraTransaction(publicClient, monadMainnet, address, tx);
          return withAccount(async (account) => {
            if (account.address.toLowerCase() !== address?.toLowerCase()) throw new Error("Please sign in with the same passkey.");
            return sendMeraTransaction(account, monadMainnet, process.env.NEXT_PUBLIC_MONAD_RPC_URL, transaction);
          });
        }
        if (method.startsWith("eth_sign") || method.startsWith("wallet_")) throw new Error("This signing action is not supported by Bondline.");
        return publicClient.request({ method, params } as Parameters<typeof publicClient.request>[0]);
      },
      on() {}, removeListener() {},
    };
    return {
      id: "mera", name: "Passkey", type: "mera",
      async connect<withCapabilities extends boolean = false>(parameters?: { chainId?: number; isReconnecting?: boolean; withCapabilities?: withCapabilities | boolean }): Promise<{ accounts: withCapabilities extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[]; chainId: number }> {
        address = await withAccount(async (account) => account.address);
        return { accounts: (parameters?.withCapabilities ? [{ address, capabilities: {} }] : [address]) as unknown as withCapabilities extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[], chainId: monadMainnet.id };
      },
      async disconnect() { address = undefined; },
      async getAccounts() { return address ? [address] : []; },
      async getChainId() { return monadMainnet.id; },
      async getProvider() { return provider; },
      async isAuthorized() { return false; }, // no silent recovery of key material
      onAccountsChanged(accounts) { config.emitter.emit("change", { accounts: accounts as Address[] }); },
      onChainChanged() {},
      onDisconnect() { address = undefined; config.emitter.emit("disconnect"); },
    };
  });
}
