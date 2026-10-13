import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { meraConnector } from "./mera";
import { monadMainnet } from "./chain";

export const externalWalletsEnabled = process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_WALLET !== "false";

export const wagmiConfig = createConfig({
  chains: [monadMainnet],
  connectors: [meraConnector(), ...(externalWalletsEnabled ? [injected()] : [])],
  transports: {
    143: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL),
    10143: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL),
  },
  multiInjectedProviderDiscovery: externalWalletsEnabled,
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
