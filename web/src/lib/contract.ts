// ShipstakeVault deployed address on Monad testnet.
// Set NEXT_PUBLIC_VAULT_ADDRESS in .env.local after deploying (see contracts/).
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const vaultAbi = [
  {
    type: "function",
    name: "createCommitment",
    stateMutability: "payable",
    inputs: [
      { name: "description", type: "string" },
      { name: "deadline", type: "uint64" },
      { name: "witness", type: "address" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "markComplete",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimForfeit",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isForfeitable",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "commitmentCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "witness", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "stake", type: "uint96" },
      { name: "deadline", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "description", type: "string" },
    ],
  },
  {
    type: "event",
    name: "CommitmentCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "stake", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
] as const;

export enum Status {
  Active = 0,
  Completed = 1,
  Forfeited = 2,
}

export type Commitment = {
  id: bigint;
  creator: `0x${string}`;
  witness: `0x${string}`;
  beneficiary: `0x${string}`;
  stake: bigint;
  deadline: bigint;
  status: Status;
  description: string;
};
