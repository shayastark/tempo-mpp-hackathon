"use client";

import { http, createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { webAuthn, dangerous_secp256k1, KeyManager } from "wagmi/tempo";
import { tempoMainnet } from "./chains";

// All RPC traffic goes through the local /api/rpc proxy which forwards to the
// upstream with credentials server-side. Browsers block fetch requests that
// contain user:password@ in the URL, so we never put the credentialed URL here.
const rpcUrl = "/api/rpc";

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
  // Versioned storage key: incrementing the key suffix discards incompatible
  // persisted state instead of throwing a migration error.
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    key: "tempo-escrow.v1",
  }),
});
