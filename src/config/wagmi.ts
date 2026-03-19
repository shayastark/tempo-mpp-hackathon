"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { webAuthn, dangerous_secp256k1, KeyManager } from "wagmi/tempo";
import { tempoTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [tempoTestnet],
  connectors: [
    // Tempo passkey wallet (WebAuthn P256)
    webAuthn({
      keyManager: KeyManager.localStorage(),
    }),
    // Dev-only secp256k1 connector (generates a local key)
    dangerous_secp256k1(),
    // Browser extension wallets (MetaMask, etc.)
    injected(),
  ],
  transports: {
    [tempoTestnet.id]: http(),
  },
});
