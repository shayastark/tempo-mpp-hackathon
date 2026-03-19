import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
  },
  networks: {
    tempoTestnet: {
      type: "http",
      url: "https://rpc.testnet.tempo.xyz",
      chainId: 1996,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    tempoMainnet: {
      type: "http",
      url: "https://rpc.tempo.xyz",
      chainId: 1998,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
