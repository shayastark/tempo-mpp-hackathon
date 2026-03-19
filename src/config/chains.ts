import { tempo } from "viem/chains";

// Default fee token (USDC) — used by the Tempo chain config's
// prepareTransactionRequest middleware to auto-fill feeToken on every tx.
const USDC_FEE_TOKEN = "0x20c000000000000000000000b9537d11c60e8b50";

export const tempoMainnet = {
  ...tempo,
  // Set chain-level default fee token so viem's Tempo middleware includes it
  // in every prepared transaction. Without this, injected wallets (Coinbase,
  // MetaMask) fail gas estimation because Tempo has no native gas token.
  feeToken: USDC_FEE_TOKEN,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
};
