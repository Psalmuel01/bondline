import "server-only";

import { createPublicClient, http, isAddress } from "viem";
import {
  CIRCLE_FACTORY_ADDRESS,
  circleAbi,
  circleFactoryAbi,
  isConfigured,
} from "@/lib/contracts";
import { monadMainnet } from "@/lib/chain";

const client = createPublicClient({
  chain: monadMainnet,
  transport: http(process.env.MONAD_RPC_URL),
});

export async function isCircleMember(circleAddress: string, walletAddress: `0x${string}`) {
  if (!isConfigured || !isAddress(circleAddress)) return false;

  // The factory registry is the authority for genuine Bondline Circle clones.
  // Never authorize a contract merely because it implements isMember().
  const isRegisteredCircle = await client.readContract({
    address: CIRCLE_FACTORY_ADDRESS,
    abi: circleFactoryAbi,
    functionName: "isCircle",
    args: [circleAddress],
  });
  if (!isRegisteredCircle) return false;

  return client.readContract({
    address: circleAddress,
    abi: circleAbi,
    functionName: "isMember",
    args: [walletAddress],
  });
}
