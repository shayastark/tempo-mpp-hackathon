"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient, useConnections } from "wagmi";
import { zeroAddress } from "viem";
import { tempoActions, Actions } from "viem/tempo";
import { DEFAULT_TOKEN } from "@/config/contracts";

const INJECTED_CONNECTOR_IDS = ["injected", "metaMask", "coinbaseWallet"];

/**
 * For injected wallets (Coinbase Wallet, MetaMask) on Tempo, the user must
 * register a fee token via FeeManager.setUserToken() before any transaction
 * can succeed. This hook checks whether that's been done and provides a
 * one-click setter that auto-fills USDC.
 *
 * Uses viem's tempoActions() decorator so the transaction goes through Tempo's
 * prepareTransactionRequest middleware (which adds feeToken from chain config).
 *
 * For passkey / secp256k1 connectors this is a no-op (needsSetup = false).
 */
export function useFeeTokenGuard() {
  const { address } = useAccount();
  const connections = useConnections();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const activeConnectorId = connections[0]?.connector?.id ?? "";
  const isInjectedWallet = INJECTED_CONNECTOR_IDS.some((id) =>
    activeConnectorId.toLowerCase().includes(id.toLowerCase())
  );

  // Check current fee token on-chain
  const [currentFeeToken, setCurrentFeeToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkFeeToken = useCallback(async () => {
    if (!address || !publicClient || !isInjectedWallet) return;
    setIsChecking(true);
    try {
      const client = publicClient.extend(tempoActions());
      const result = await client.fee.getUserToken({ account: address });
      setCurrentFeeToken(result?.address ?? zeroAddress);
    } catch {
      setCurrentFeeToken(null);
    } finally {
      setIsChecking(false);
    }
  }, [address, publicClient, isInjectedWallet]);

  useEffect(() => {
    checkFeeToken();
  }, [checkFeeToken]);

  const feeTokenIsSet = !!currentFeeToken && currentFeeToken !== zeroAddress;

  // State for the setUserToken write
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setFeeToken = useCallback(async () => {
    if (!walletClient) return;
    setError(null);
    setIsPending(true);
    setIsSuccess(false);

    try {
      const client = walletClient.extend(tempoActions());
      setIsPending(true);
      const hash = await client.fee.setUserToken({
        token: DEFAULT_TOKEN as `0x${string}`,
      });

      setIsPending(false);
      setIsConfirming(true);

      // Wait for receipt
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setIsConfirming(false);
      setIsSuccess(true);
      // Re-check the fee token
      await checkFeeToken();
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [walletClient, publicClient, checkFeeToken]);

  return {
    /** True when the connected wallet is an injected browser wallet */
    isInjectedWallet,
    /** True when the user still needs to call setUserToken */
    needsSetup: isInjectedWallet && !feeTokenIsSet && !isChecking,
    /** The currently registered fee token (or zeroAddress) */
    currentFeeToken,
    /** One-click: calls FeeManager.setUserToken(USDC) via tempoActions */
    setFeeToken,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
