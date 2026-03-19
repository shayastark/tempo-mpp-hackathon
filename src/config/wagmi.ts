"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { webAuthn, dangerous_secp256k1, KeyManager } from "wagmi/tempo";
import { tempoMainnet } from "./chains";

// Use a private RPC if provided (Alchemy, QuickNode, dRPC, etc.) to avoid
// 429 rate-limit errors from the public endpoint under load.
const rpcUrl =
  process.env.NEXT_PUBLIC_TEMPO_RPC_URL ?? "https://rpc.tempo.xyz";

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
    [tempoMainnet.id]: http(rpcUrl, {
      // Retry up to 3 times with backoff on 429 / network errors
      retryCount: 3,
      retryDelay: 1500,
    }),
  },
});
