import { tempo } from "viem/chains";

// Do NOT set feeToken on the chain. Adding feeToken causes Tempo's
// prepareTransactionRequest middleware to convert every tx to type 0x76,
// which injected wallets (MetaMask, Coinbase) cannot process.
//
// Instead, Tempo's RPC auto-selects the fee token from tx.to when it's
// a TIP-20 contract (e.g. USDC approve → tx.to = USDC → fees paid in USDC).
// For non-TIP-20 targets, the user must first call setUserToken via the
// fee token guard.
export const tempoMainnet = {
  ...tempo,
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
      webSocket: ["wss://rpc.tempo.xyz"],
    },
  },
};
