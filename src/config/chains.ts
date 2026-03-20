import { tempo } from "viem/chains";
import { DEFAULT_TOKEN } from "./contracts";

// Use tempo.extend() (not object spread) so the chain's prepareTransactionRequest
// middleware, formatters, and serializers are preserved correctly. The feeToken
// tells Tempo which TIP-20 token to use for gas on every transaction.
export const tempoMainnet = tempo.extend({
  feeToken: DEFAULT_TOKEN,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
});
