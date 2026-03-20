"use client";

import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { DEFAULT_TOKEN } from "@/config/contracts";

/**
 * Tempo fee token guard.
 *
 * On Tempo, calling `approve` (or any non-transfer function) on a TIP-20
 * falls through to pathUSD for gas — which the user likely doesn't have.
 *
 * The fix: call `setUserToken(USDC)` on FeeManager FIRST. The fee spec
 * (Level 2 special case) says that when `setUserToken` is called with a
 * valid TIP-20 USD token, that token is used as the fee token for the
 * call itself — so it's self-bootstrapping. No pathUSD needed.
 *
 * After that, ALL subsequent transactions use USDC for gas (Level 2),
 * regardless of which contract function is called.
 *
 * This guard applies to ALL wallet types (injected and passkey/secp256k1).
 */
export function useFeeTokenGuard() {
  const { address } = useAccount();

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
    /** True when the user still needs to call setUserToken */
    needsSetup: !feeTokenIsSet && !isChecking && !!address,
    /** The currently registered fee token (or null) */
    currentFeeToken,
    /** One-click: calls FeeManager.setUserToken(USDC) — self-bootstrapping */
    setFeeToken,
    isPending,
    isSuccess,
    error,
  };
}
