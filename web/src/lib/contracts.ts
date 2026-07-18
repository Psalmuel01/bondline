// Bondline contract layer — addresses, ABIs, types, enums.
// Two singletons (factory + vault) plus per-pod clones discovered at runtime.
//
// Set these in web/.env.local after deploying (see contracts/README):
//   NEXT_PUBLIC_FACTORY_ADDRESS=0x…
//   NEXT_PUBLIC_VAULT_ADDRESS=0x…

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  ZERO) as `0x${string}`;
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  ZERO) as `0x${string}`;

export const isConfigured =
  FACTORY_ADDRESS !== ZERO && VAULT_ADDRESS !== ZERO;

// --- enums / types ---

export enum Status {
  Active = 0, // staked, deadline running
  PendingVote = 1, // creator declared, group is voting
  Completed = 2, // approved -> refunded
  Forfeited = 3, // rejected or expired -> funded the pod
}

export type Commitment = {
  id: bigint;
  creator: `0x${string}`;
  pod: `0x${string}`;
  stake: bigint;
  deadline: bigint;
  voteClosesAt: bigint;
  status: Status;
  yesVotes: number;
  noVotes: number;
  description: string;
  evidenceHash: `0x${string}`;
  evidenceUri: string;
};

export type Pod = {
  address: `0x${string}`;
  name: string;
  members: `0x${string}`[];
  approvalThresholdBps: number;
  balance: bigint;
};

export type Proposal = {
  id: bigint;
  pod: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  executed: boolean;
  approvals: number;
  memo: string;
};

// --- ABIs ---

export const factoryAbi = [
  {
    type: "function",
    name: "createPod",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name_", type: "string" },
      { name: "members_", type: "address[]" },
      { name: "approvalThresholdBps_", type: "uint16" },
    ],
    outputs: [{ name: "pod", type: "address" }],
  },
  {
    type: "function",
    name: "allPods",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "podCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isPod",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "PodCreated",
    inputs: [
      { name: "pod", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "members", type: "address[]", indexed: false },
      { name: "approvalThresholdBps", type: "uint16", indexed: false },
    ],
  },
] as const;

export const podAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "approvalThresholdBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "members",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "memberCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isMember",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "requiredApprovals",
    stateMutability: "view",
    inputs: [{ name: "eligibleVoters", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const vaultAbi = [
  {
    type: "function",
    name: "createCommitment",
    stateMutability: "payable",
    inputs: [
      { name: "pod", type: "address" },
      { name: "description", type: "string" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "declareComplete",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "evidenceHash", type: "bytes32" },
      { name: "evidenceUri", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "castVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "approve", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveExpired",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "forfeitMissed",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "proposeWithdrawal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pod", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "function",
    name: "approveWithdrawal",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
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
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "pod", type: "address" },
      { name: "stake", type: "uint96" },
      { name: "deadline", type: "uint64" },
      { name: "voteClosesAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "yesVotes", type: "uint32" },
      { name: "noVotes", type: "uint32" },
      { name: "description", type: "string" },
      { name: "evidenceHash", type: "bytes32" },
      { name: "evidenceUri", type: "string" },
    ],
  },
  {
    type: "function",
    name: "voteState",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "eligible", type: "uint256" },
      { name: "required", type: "uint256" },
      { name: "yes", type: "uint32" },
      { name: "no", type: "uint32" },
      { name: "approvedNow", type: "bool" },
      { name: "rejectableNow", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "proposals",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "pod", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "executed", type: "bool" },
      { name: "approvals", type: "uint32" },
      { name: "memo", type: "string" },
    ],
  },
  {
    type: "function",
    name: "hasApprovedWithdrawal",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "VOTE_WINDOW",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "event",
    name: "CommitmentCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "pod", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "approve", type: "bool", indexed: false },
      { name: "yesVotes", type: "uint32", indexed: false },
      { name: "noVotes", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CommitmentResolved",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
      { name: "stake", type: "uint256", indexed: false },
    ],
  },
] as const;
