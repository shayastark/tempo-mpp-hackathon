import { tempo } from "viem/chains";

export const tempoMainnet = {
  ...tempo,
  // Override RPC URLs — the app routes through /api/rpc proxy, but this
  // fallback is used by viem internals and wagmi connectors.
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
};
