import { tempo } from "viem/chains";

export const tempoMainnet = {
  ...tempo,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
};
