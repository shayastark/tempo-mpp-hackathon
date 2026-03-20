"use client";

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, TIP20_ABI, DEFAULT_TOKEN } from "@/config/contracts";

// Tempo has no native gas token — every tx must declare which TIP-20 token pays
// for gas via feeToken. For local accounts (webAuthn/secp256k1) this is auto-
// filled by Tempo's prepareTransactionRequest middleware from the chain config.
// For injected wallets (Coinbase Wallet, MetaMask) prepareTransactionRequest is
// NOT called, so we must include feeToken explicitly on every write call.
const FEE_TOKEN = DEFAULT_TOKEN as `0x${string}`;

export type EscrowStatus = "Active" | "Released" | "Refunded" | "Disputed" | "Expired";
export type ReleaseCondition = "AgentApproval" | "TimeLock" | "MultiSig" | "SocialVerified";

const STATUS_MAP: EscrowStatus[] = ["Active", "Released", "Refunded", "Disputed", "Expired"];
const CONDITION_MAP: ReleaseCondition[] = ["AgentApproval", "TimeLock", "MultiSig", "SocialVerified"];

export interface EscrowData {
  depositor: string;
  recipient: string;
  token: string;
  amount: bigint;
  createdAt: bigint;
  deadline: bigint;
  releaseTime: bigint;
  status: EscrowStatus;
  condition: ReleaseCondition;
  memo: string;
  description: string;
  approvalCount: bigint;
  requiredApprovals: bigint;
  socialHandle: string;
  socialPlatform: string;
}

export function useEscrowCount() {
  return useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextEscrowId",
  });
}

// Batch-reads all escrows + their social data on-chain. Used by the bounties page.
// Each escrow needs two calls: getEscrow (main data) + getEscrowSocial (socialHandle/platform).
// Calls are interleaved: [getEscrow(0), getEscrowSocial(0), getEscrow(1), getEscrowSocial(1), ...]
export function useAllEscrowsData(count: number) {
  const contracts = Array.from({ length: count }, (_, i) => [
    {
      address: ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI as Abi,
      functionName: "getEscrow",
      args: [BigInt(i)],
    },
    {
      address: ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI as Abi,
      functionName: "getEscrowSocial",
      args: [BigInt(i)],
    },
  ]).flat();

  const { data, isLoading, isError } = useReadContracts({
    contracts,
    query: {
      enabled: count > 0,
      staleTime: 15_000,
      refetchInterval: 15_000,
    },
  });

  const parsed = Array.from({ length: count }, (_, i) => {
    const mainResult = data?.[i * 2];
    const socialResult = data?.[i * 2 + 1];
    if (mainResult?.status !== "success" || !mainResult.result) return null;

    // getEscrowSocial returns [socialHandle, socialPlatform] as an array
    const socialArr = socialResult?.status === "success" && socialResult.result
      ? (socialResult.result as readonly [string, string])
      : null;
    const social = socialArr
      ? { socialHandle: socialArr[0] ?? "", socialPlatform: socialArr[1] ?? "" }
      : { socialHandle: "", socialPlatform: "" };

    return {
      id: BigInt(i),
      ...parseEscrowResult(mainResult.result as RawEscrowResult),
      socialHandle: social.socialHandle ?? "",
      socialPlatform: social.socialPlatform ?? "",
    };
  }).filter((e): e is EscrowData & { id: bigint } => e !== null);

  return { data: parsed, isLoading, isError };
}

// getEscrow returns 13 individual values (not a tuple):
// [depositor, recipient, token, amount, createdAt, deadline, releaseTime,
//  status, condition, memo, description, approvalCount, requiredApprovals]
type RawEscrowResult = readonly [
  string, string, string, bigint, bigint, bigint, bigint,
  number, number, string, string, bigint, bigint,
];

function parseEscrowResult(r: RawEscrowResult): EscrowData {
  return {
    depositor: r[0],
    recipient: r[1],
    token: r[2],
    amount: r[3],
    createdAt: r[4],
    deadline: r[5],
    releaseTime: r[6],
    status: STATUS_MAP[Number(r[7])] ?? "Active",
    condition: CONDITION_MAP[Number(r[8])] ?? "AgentApproval",
    memo: r[9],
    description: r[10],
    approvalCount: r[11],
    requiredApprovals: r[12],
    socialHandle: "",
    socialPlatform: "",
  };
}

export function useEscrowData(escrowId: bigint) {
  const { data, ...rest } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getEscrow",
    args: [escrowId],
  });

  const parsed: EscrowData | undefined = data
    ? parseEscrowResult(data as unknown as RawEscrowResult)
    : undefined;

  return { data: parsed, ...rest };
}

export function useEscrowAgents(escrowId: bigint) {
  return useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getEscrowAgents",
    args: [escrowId],
  });
}

export function useUserEscrows(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getUserEscrows",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useRecipientEscrows(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getRecipientEscrows",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// ---------------------------------------------------------------------------
// Write hooks
//
// Tempo has no native gas token — gas is paid in TIP-20 USDC. For local
// accounts the chain-level feeToken auto-fills via prepareTransactionRequest,
// but injected wallets (json-rpc accounts) skip that middleware entirely.
// We pass feeToken explicitly on every write call so both paths work.
// The `as any` cast is needed because wagmi's types don't include feeToken.
// ---------------------------------------------------------------------------

export function useCreateEscrow() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = (params: {
    recipient: `0x${string}`;
    token: `0x${string}`;
    amount: bigint;
    deadline: bigint;
    releaseTime: bigint;
    condition: number;
    agents: `0x${string}`[];
    requiredApprovals: bigint;
    memo: `0x${string}`;
    description: string;
    socialHandle: string;
    socialPlatform: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [
        params.recipient,
        params.token,
        params.amount,
        params.deadline,
        params.releaseTime,
        params.condition,
        params.agents,
        params.requiredApprovals,
        params.memo,
        params.description,
        params.socialHandle,
        params.socialPlatform,
      ],
      feeToken: FEE_TOKEN,
      gas: BigInt(5_000_000),
    } as any);
  };

  return { create, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveRelease() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (escrowId: bigint) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "approveRelease",
      args: [escrowId],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseTimeLock() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const release = (escrowId: bigint) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "releaseTimeLock",
      args: [escrowId],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseSocialVerified() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const release = (escrowId: bigint, verified: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "releaseSocialVerified",
      args: [escrowId, verified],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useRefundExpired() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const refund = (escrowId: bigint) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "refundExpired",
      args: [escrowId],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { refund, hash, isPending, isConfirming, isSuccess, error };
}

export function useDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const disputeEscrow = (escrowId: bigint) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "dispute",
      args: [escrowId],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { disputeEscrow, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimBounty() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = (escrowId: bigint, claimant: `0x${string}`) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "claimBounty",
      args: [escrowId, claimant],
      feeToken: FEE_TOKEN,
    } as any);
  };

  return { claim, hash, isPending, isConfirming, isSuccess, error };
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function isBounty(escrow: EscrowData): boolean {
  return escrow.recipient === ZERO_ADDRESS;
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveToken = (token: `0x${string}`, amount: bigint) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({
      address: token,
      abi: TIP20_ABI,
      functionName: "approve",
      args: [ESCROW_CONTRACT_ADDRESS, amount],
      feeToken: FEE_TOKEN,
      // Explicit gas skips eth_estimateGas. Tempo's RPC simulates the full
      // pre-tx fee deduction (max_fee = gas_limit * gas_price) during
      // estimation, starting from the block gas limit. That initial probe
      // can exceed the user's USDC balance and fail with "insufficient
      // funds". 2M is generous for a TIP-20 approve while keeping the
      // upfront fee reservation small (~0.13 USDC at typical gas prices).
      gas: BigInt(2_000_000),
    } as any);
  };

  return { approveToken, hash, isPending, isConfirming, isSuccess, error };
}

export function useTokenBalance(token: `0x${string}` | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: token,
    abi: TIP20_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!token && !!account },
  });
}
