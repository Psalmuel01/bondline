import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadMainnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [monadMainnet],
  connectors: [injected()],
  transports: {
    [monadMainnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
