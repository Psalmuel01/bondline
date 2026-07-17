import { defineChain } from "viem";

// Monad testnet (reset from genesis 2025-12-16). Chain id 10143.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

export const explorerTx = (hash: string) =>
  `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddr = (addr: string) =>
  `${monadTestnet.blockExplorers.default.url}/address/${addr}`;
