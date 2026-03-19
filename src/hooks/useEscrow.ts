"use client";

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, TIP20_ABI } from "@/config/contracts";

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
      // Poll every 15s instead of constantly to avoid 429s on the public RPC.
      // Set NEXT_PUBLIC_TEMPO_RPC_URL to a private endpoint to remove this limit.
      staleTime: 15_000,
      refetchInterval: 15_000,
    },
  });

  const parsed = Array.from({ length: count }, (_, i) => {
    const mainResult = data?.[i * 2];
    const socialResult = data?.[i * 2 + 1];
    if (mainResult?.status !== "success" || !mainResult.result) return null;

    const social = socialResult?.status === "success" && socialResult.result
      ? (socialResult.result as { socialHandle: string; socialPlatform: string })
      : { socialHandle: "", socialPlatform: "" };

    return {
      id: BigInt(i),
      ...parseEscrowInfo(mainResult.result as RawEscrowInfo),
      socialHandle: social.socialHandle ?? "",
      socialPlatform: social.socialPlatform ?? "",
    };
  }).filter((e): e is EscrowData & { id: bigint } => e !== null);

  return { data: parsed, isLoading, isError };
}

type RawEscrowInfo = {
  depositor: string;
  recipient: string;
  token: string;
  amount: bigint;
  createdAt: bigint;
  deadline: bigint;
  releaseTime: bigint;
  status: number;
  condition: number;
  memo: string;
  description: string;
  approvalCount: bigint;
  requiredApprovals: bigint;
  socialHandle: string;
  socialPlatform: string;
};

function parseEscrowInfo(info: RawEscrowInfo): EscrowData {
  return {
    depositor: info.depositor,
    recipient: info.recipient,
    token: info.token,
    amount: info.amount,
    createdAt: info.createdAt,
    deadline: info.deadline,
    releaseTime: info.releaseTime,
    status: STATUS_MAP[Number(info.status)] ?? "Active",
    condition: CONDITION_MAP[Number(info.condition)] ?? "AgentApproval",
    memo: info.memo,
    description: info.description,
    approvalCount: info.approvalCount,
    requiredApprovals: info.requiredApprovals,
    socialHandle: info.socialHandle ?? "",
    socialPlatform: info.socialPlatform ?? "",
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
    ? parseEscrowInfo(data as RawEscrowInfo)
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
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [
        {
          recipient: params.recipient,
          token: params.token,
          amount: params.amount,
          deadline: params.deadline,
          releaseTime: params.releaseTime,
          condition: params.condition,
          agents: params.agents,
          requiredApprovals: params.requiredApprovals,
          memo: params.memo,
          description: params.description,
          socialHandle: params.socialHandle,
          socialPlatform: params.socialPlatform,
        },
      ],
    });
  };

  return { create, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveRelease() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (escrowId: bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "approveRelease",
      args: [escrowId],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseTimeLock() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const release = (escrowId: bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "releaseTimeLock",
      args: [escrowId],
    });
  };

  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseSocialVerified() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const release = (escrowId: bigint, verified: boolean) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "releaseSocialVerified",
      args: [escrowId, verified],
    });
  };

  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useRefundExpired() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const refund = (escrowId: bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "refundExpired",
      args: [escrowId],
    });
  };

  return { refund, hash, isPending, isConfirming, isSuccess, error };
}

export function useDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const disputeEscrow = (escrowId: bigint) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "dispute",
      args: [escrowId],
    });
  };

  return { disputeEscrow, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimBounty() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = (escrowId: bigint, claimant: `0x${string}`) => {
    writeContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "claimBounty",
      args: [escrowId, claimant],
    });
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
    writeContract({
      address: token,
      abi: TIP20_ABI,
      functionName: "approve",
      args: [ESCROW_CONTRACT_ADDRESS, amount],
    });
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
