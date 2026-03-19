import { tempo } from "viem/chains";

export const tempoMainnet = {
  ...tempo,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
  feeToken: "0x20c000000000000000000000b9537d11c60e8b50" as const,
};
