"use client";

import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnections } from "wagmi";
import { zeroAddress } from "viem";
import { Abis, Addresses } from "viem/tempo";
import { tempoMainnet } from "@/config/chains";
import { DEFAULT_TOKEN } from "@/config/contracts";

const INJECTED_CONNECTOR_IDS = ["injected", "metaMask", "coinbaseWallet"];

/**
 * For injected wallets (Coinbase Wallet, MetaMask) on Tempo, the user must
 * register a fee token via FeeManager.setUserToken() before any transaction
 * can succeed. This hook checks whether that's been done and provides a
 * one-click setter that auto-fills USDC.
 *
 * For passkey / secp256k1 connectors this is a no-op (needsSetup = false).
 */
export function useFeeTokenGuard() {
  const { address } = useAccount();
  const connections = useConnections();

  const activeConnectorId = connections[0]?.connector?.id ?? "";
  const isInjectedWallet = INJECTED_CONNECTOR_IDS.some((id) =>
    activeConnectorId.toLowerCase().includes(id.toLowerCase())
  );

  const { data: currentFeeToken, refetch } = useReadContract({
    address: Addresses.feeManager,
    abi: Abis.feeManager,
    functionName: "userTokens",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isInjectedWallet },
  });

  const feeTokenIsSet = !!currentFeeToken && currentFeeToken !== zeroAddress;

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  const setFeeToken = () => {
    reset();
    writeContract({
      address: Addresses.feeManager,
      abi: Abis.feeManager,
      functionName: "setUserToken",
      args: [DEFAULT_TOKEN as `0x${string}`],
      chainId: tempoMainnet.id,
    });
  };

  return {
    /** True when the connected wallet is an injected browser wallet */
    isInjectedWallet,
    /** True when the user still needs to call setUserToken */
    needsSetup: isInjectedWallet && !feeTokenIsSet,
    /** The currently registered fee token (or zeroAddress) */
    currentFeeToken,
    /** One-click: calls FeeManager.setUserToken(USDC) */
    setFeeToken,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
