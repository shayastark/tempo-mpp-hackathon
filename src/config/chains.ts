import { defineChain } from "viem";

export const tempoTestnet = defineChain({
  id: 1996, // Tempo testnet chain ID
  name: "Tempo Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.tempo.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Tempo Explorer",
      url: "https://explorer.testnet.tempo.xyz",
    },
  },
  testnet: true,
});

export const tempoMainnet = defineChain({
  id: 1998, // Tempo mainnet chain ID
  name: "Tempo",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.tempo.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Tempo Explorer",
      url: "https://explorer.tempo.xyz",
    },
  },
});
