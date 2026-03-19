"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { webAuthn, dangerous_secp256k1, KeyManager } from "wagmi/tempo";
import { tempoMainnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [tempoMainnet],
  connectors: [
    webAuthn({
      keyManager: KeyManager.localStorage(),
    }),
    dangerous_secp256k1(),
    injected(),
  ],
  transports: {
    [tempoMainnet.id]: http(),
  },
});
