// Contract addresses - update after deployment
export const ESCROW_CONTRACT_ADDRESS = "0xFc678Ea5e41453Ba6685b97713f78D881639E6FB" as const;

// Known TIP-20 token addresses on Tempo
export const KNOWN_TOKENS = {
  USDC: "0x20c000000000000000000000b9537d11c60e8b50",
} as const;

// Default token used for escrows
export const DEFAULT_TOKEN = KNOWN_TOKENS.USDC;

// ABI for the TempoEscrow contract
export const ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_feeCollector", type: "address" }],
  },
  // Events
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "depositor", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "condition", type: "uint8", indexed: false },
      { name: "memo", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowReleased",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "releasedBy", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowRefunded",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowDisputed",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "disputedBy", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AgentApproved",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "approvalCount", type: "uint256", indexed: false },
      { name: "required", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SocialVerification",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "platform", type: "string", indexed: false },
      { name: "handle", type: "string", indexed: false },
      { name: "verified", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BountyClaimed",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "claimant", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "claimedBy", type: "address", indexed: false },
    ],
  },
  // Read functions
  {
    type: "function",
    name: "nextEscrowId",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PROTOCOL_FEE_BPS",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEscrow",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      { name: "depositor", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "releaseTime", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "condition", type: "uint8" },
      { name: "memo", type: "bytes32" },
      { name: "description", type: "string" },
      { name: "approvalCount", type: "uint256" },
      { name: "requiredApprovals", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEscrowAgents",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEscrowSocial",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      { name: "socialHandle", type: "string" },
      { name: "socialPlatform", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserEscrows",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRecipientEscrows",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasApproved",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "createEscrow",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "recipient", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "releaseTime", type: "uint256" },
          { name: "condition", type: "uint8" },
          { name: "agents", type: "address[]" },
          { name: "requiredApprovals", type: "uint256" },
          { name: "memo", type: "bytes32" },
          { name: "description", type: "string" },
          { name: "socialHandle", type: "string" },
          { name: "socialPlatform", type: "string" },
        ],
      },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimBounty",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "claimant", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approveRelease",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "releaseTimeLock",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "releaseSocialVerified",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "verified", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundExpired",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dispute",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveDispute",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "releaseToRecipient", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// TIP-20 Token ABI (minimal)
export const TIP20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;
