import solc from "solc";
import fs from "fs";
import path from "path";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const tempoTestnet = defineChain({
  id: 1996,
  name: "Tempo Testnet",
  nativeCurrency: { name: "pathUSD", symbol: "pathUSD", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.tempo.xyz"] } },
});

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set DEPLOYER_PRIVATE_KEY env var (with 0x prefix)");
    process.exit(1);
  }

  // 1. Compile
  console.log("Compiling contracts...");
  const contractsDir = path.resolve("contracts");

  const input = {
    language: "Solidity",
    sources: {
      "src/TempoEscrow.sol": {
        content: fs.readFileSync(path.join(contractsDir, "src/TempoEscrow.sol"), "utf8"),
      },
      "interfaces/ITIP20.sol": {
        content: fs.readFileSync(path.join(contractsDir, "interfaces/ITIP20.sol"), "utf8"),
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: { severity: string }) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:");
      errors.forEach((e: { formattedMessage: string }) => console.error(e.formattedMessage));
      process.exit(1);
    }
    // Print warnings
    output.errors
      .filter((e: { severity: string }) => e.severity === "warning")
      .forEach((e: { formattedMessage: string }) => console.warn(e.formattedMessage));
  }

  const contract = output.contracts["src/TempoEscrow.sol"]["TempoEscrow"];
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}` as `0x${string}`;

  console.log("Compilation successful!");

  // 2. Deploy
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log("Deployer:", account.address);

  const publicClient = createPublicClient({
    chain: tempoTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: tempoTestnet,
    transport: http(),
  });

  // Use deployer as fee collector
  const feeCollector = account.address;
  console.log("Fee collector:", feeCollector);

  console.log("Deploying TempoEscrow...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [feeCollector],
  });

  console.log("Transaction hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("\n=== Deployment Complete ===");
  console.log("TempoEscrow deployed to:", receipt.contractAddress);
  console.log("Block:", receipt.blockNumber);
  console.log(
    "\nUpdate src/config/contracts.ts with:\n" +
      `  export const ESCROW_CONTRACT_ADDRESS = "${receipt.contractAddress}" as const;`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
