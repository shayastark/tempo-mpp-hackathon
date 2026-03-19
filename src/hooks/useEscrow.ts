"use client";

import { useState } from "react";
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { simulateContract } from "@wagmi/core";
import type { Abi } from "viem";
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, TIP20_ABI, DEFAULT_TOKEN } from "@/config/contracts";
import { tempoMainnet } from "@/config/chains";
import { wagmiConfig } from "@/config/wagmi";

// Tempo has no native gas token — every tx must declare which TIP-20 token pays
// for gas. Without this field the wallet cannot simulate the tx and shows
// "Something is wrong".
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
// Injected wallets (Coinbase Wallet, MetaMask) do their own gas estimation
// using their own RPC, which does NOT use viem's Tempo-aware formatters.
// The Tempo RPC strips EIP-1559 fields for estimateGas, but the wallet
// doesn't know this and sends them anyway — causing "something went wrong".
//
// Fix: simulate the call first using the app's transport (standard eth_call),
// then add the feeToken to the prepared request before handing it to the
// wallet via writeContract. The wallet sees gas is already set and skips its
// own estimation. We do NOT pass feeToken to simulateContract because that
// triggers viem's Tempo formatters to convert eth_call into Tempo Transaction
// format (type 0x76 with calls[]), which the RPC rejects with 500.
// ---------------------------------------------------------------------------

export function useCreateEscrow() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const create = async (params: {
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
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
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
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { create, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveRelease() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const approve = async (escrowId: bigint) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "approveRelease",
        args: [escrowId],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseTimeLock() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const release = async (escrowId: bigint) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "releaseTimeLock",
        args: [escrowId],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useReleaseSocialVerified() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const release = async (escrowId: bigint, verified: boolean) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "releaseSocialVerified",
        args: [escrowId, verified],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { release, hash, isPending, isConfirming, isSuccess, error };
}

export function useRefundExpired() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const refund = async (escrowId: bigint) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "refundExpired",
        args: [escrowId],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { refund, hash, isPending, isConfirming, isSuccess, error };
}

export function useDispute() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const disputeEscrow = async (escrowId: bigint) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "dispute",
        args: [escrowId],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { disputeEscrow, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimBounty() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const claim = async (escrowId: bigint, claimant: `0x${string}`) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "claimBounty",
        args: [escrowId, claimant],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
  return { claim, hash, isPending, isConfirming, isSuccess, error };
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function isBounty(escrow: EscrowData): boolean {
  return escrow.recipient === ZERO_ADDRESS;
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [simError, setSimError] = useState<Error | null>(null);

  const approveToken = async (token: `0x${string}`, amount: bigint) => {
    try {
      setSimError(null);
      const { request } = await simulateContract(wagmiConfig, {
        address: token,
        abi: TIP20_ABI,
        functionName: "approve",
        args: [ESCROW_CONTRACT_ADDRESS, amount],
        chainId: tempoMainnet.id,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ ...request, feeToken: FEE_TOKEN } as any);
    } catch (e) {
      setSimError(e as Error);
    }
  };

  const error = writeError || simError;
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
