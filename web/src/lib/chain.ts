import { defineChain } from "viem";

// Monad mainnet (public launch 2025-11-24). Chain id 143.
export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: "https://monadscan.com",
    },
  },
  testnet: false,
});

export const explorerTx = (hash: string) =>
  `${monadMainnet.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddr = (addr: string) =>
  `${monadMainnet.blockExplorers.default.url}/address/${addr}`;
