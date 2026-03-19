"use client";

import { useEffect, useRef } from "react";
import { useWalletClient } from "wagmi";
import { Mppx, tempo } from "mppx/client";

/**
 * Initializes the mppx client when a wallet is connected.
 * Polyfills globalThis.fetch to automatically handle 402 Payment Required
 * responses using the Tempo payment method.
 */
export function MppProvider({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (!walletClient) {
      // Restore original fetch if wallet disconnects
      if (initialized.current) {
        Mppx.restore();
        initialized.current = false;
      }
      return;
    }

    // Set up mppx with the connected wallet's account
    Mppx.create({
      methods: [
        tempo({
          account: walletClient.account,
          getClient: () => walletClient,
        }),
      ],
      polyfill: true,
    });
    initialized.current = true;

    return () => {
      Mppx.restore();
      initialized.current = false;
    };
  }, [walletClient]);

  return <>{children}</>;
}
