"use client";

import { useAccount, useConnections } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { DEFAULT_TOKEN } from "@/config/contracts";

const INJECTED_CONNECTOR_IDS = ["injected", "metaMask", "coinbaseWallet"];

/**
 * For injected wallets (Coinbase Wallet, MetaMask) on Tempo, the user must
 * register a fee token via FeeManager.setUserToken() before any transaction
 * can succeed. This hook checks whether that's been done and provides a
 * one-click setter that auto-fills USDC.
 *
 * Uses the official wagmi/tempo Hooks which go through Tempo's proper
 * transaction pipeline (prepareTransactionRequest middleware, etc.).
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

  // Read current fee token using the official wagmi/tempo hook
  const { data: currentFeeToken, isLoading: isChecking } =
    Hooks.fee.useUserToken({
      account: address,
      query: { enabled: !!address },
    });

  const feeTokenIsSet = !!currentFeeToken;

  // Set fee token using the official wagmi/tempo hook (waits for receipt)
  const {
    mutate: setUserTokenSync,
    isPending,
    isSuccess,
    error,
  } = Hooks.fee.useSetUserTokenSync();

  const setFeeToken = () => {
    setUserTokenSync({
      token: DEFAULT_TOKEN as `0x${string}`,
    });
  };

  return {
    /** True when the connected wallet is an injected browser wallet */
    isInjectedWallet,
    /** True when the user still needs to call setUserToken */
    needsSetup: isInjectedWallet && !feeTokenIsSet && !isChecking,
    /** The currently registered fee token (or null) */
    currentFeeToken,
    /** One-click: calls FeeManager.setUserToken(USDC) via wagmi/tempo */
    setFeeToken,
    isPending,
    isConfirming: false,
    isSuccess,
    error,
  };
}
