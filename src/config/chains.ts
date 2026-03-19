import { tempo, tempoModerato } from "viem/chains";

// Re-export with feeToken set to USDC on Tempo mainnet
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

export const tempoTestnet = {
  ...tempoModerato,
  feeToken: "0x20c0000000000000000000000000000000000000" as const,
};
