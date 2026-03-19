import { tempo } from "viem/chains";
import { DEFAULT_TOKEN } from "./contracts";

export const tempoMainnet = {
  ...tempo,
  // Chain-level feeToken so Tempo's prepareTransactionRequest middleware
  // auto-fills it on every transaction. Required because Tempo has no native
  // gas token — all gas is paid in a TIP-20 token (USDC).
  feeToken: DEFAULT_TOKEN,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
};
