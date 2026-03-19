"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useDeployContract,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  useConnections,
} from "wagmi";
import { isAddress, zeroAddress } from "viem";
import { Abis, Addresses } from "viem/tempo";
import artifact from "../../../contracts/artifacts/TempoEscrow.json";
import { tempoMainnet } from "@/config/chains";

const USDC_FEE_TOKEN = "0x20c000000000000000000000b9537d11c60e8b50" as const;

// Browser wallet (injected) sends standard EVM txs → fee defaults to pathUSD.
// Passkey / EOA (secp256k1) connectors send native Tempo Transactions → respects feeToken.
const INJECTED_CONNECTOR_IDS = ["injected", "metaMask", "coinbaseWallet"];

export default function DeployPage() {
  const { address, isConnected, chain } = useAccount();
  const connections = useConnections();
  const { switchChain } = useSwitchChain();
  const [feeCollector, setFeeCollector] = useState("");
  const [feeTokenInput, setFeeTokenInput] = useState("");
  const isWrongChain = chain?.id !== tempoMainnet.id;

  const activeConnectorId = connections[0]?.connector?.id ?? "";
  const isInjectedWallet = INJECTED_CONNECTOR_IDS.some((id) =>
    activeConnectorId.toLowerCase().includes(id.toLowerCase())
  );

  // Read current account-level fee token from FeeManager
  const { data: currentFeeToken, refetch: refetchFeeToken } = useReadContract({
    address: Addresses.feeManager,
    abi: Abis.feeManager,
    functionName: "userTokens",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isWrongChain },
  });

  const feeTokenIsSet =
    currentFeeToken && currentFeeToken !== zeroAddress;

  // For injected wallets: setUserToken bootstraps the fee token.
  const {
    writeContract: setUserToken,
    data: setFeeTokenHash,
    isPending: settingFeeToken,
    error: setFeeTokenError,
    reset: resetSetFeeToken,
  } = useWriteContract();

  const { isLoading: confirmingFeeToken, isSuccess: feeTokenConfirmed } =
    useWaitForTransactionReceipt({
      hash: setFeeTokenHash,
      query: { enabled: !!setFeeTokenHash },
    });

  useEffect(() => {
    if (feeTokenConfirmed) refetchFeeToken();
  }, [feeTokenConfirmed, refetchFeeToken]);

  const handleSetFeeToken = () => {
    if (!address || !isAddress(feeTokenInput)) return;
    resetSetFeeToken();
    setUserToken({
      address: Addresses.feeManager,
      abi: Abis.feeManager,
      functionName: "setUserToken",
      args: [feeTokenInput as `0x${string}`],
      chainId: tempoMainnet.id,
    });
  };

  // Deploy contract
  const {
    deployContract,
    data: txHash,
    isPending: deploying,
    error: deployError,
    reset,
  } = useDeployContract();

  const {
    data: receipt,
    isLoading: confirming,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const contractAddress = receipt?.contractAddress;
  const deployError_ = deployError || receiptError;

  const canDeploy = isInjectedWallet ? feeTokenIsSet : true;

  const handleDeploy = () => {
    if (!address) return;
    reset();
    const collector = (feeCollector.trim() || address) as `0x${string}`;
    deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as `0x${string}`,
      args: [collector],
      chainId: tempoMainnet.id,
      // Explicitly set USDC as the fee token for Tempo Transactions.
      // Only respected by Passkey / EOA (secp256k1) connectors.
      // @ts-expect-error — Tempo-specific transaction field
      feeToken: USDC_FEE_TOKEN,
    });
  };

  const explorerUrl = chain?.blockExplorers?.default?.url;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Deploy TempoEscrow</h1>
      <p className="text-zinc-400 mb-8">
        Deploy the escrow smart contract to Tempo using your connected wallet.
      </p>

      {!isConnected && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm mb-6">
          Connect your wallet first to deploy the contract.
        </div>
      )}

      {isConnected && (
        <div className="space-y-6">
          {isWrongChain && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-center justify-between">
              <p className="text-red-200 text-sm">
                You are connected to{" "}
                <strong>{chain?.name || "an unsupported network"}</strong>.
                Switch to <strong>Tempo</strong> (Chain ID {tempoMainnet.id}).
              </p>
              <button
                onClick={() => switchChain({ chainId: tempoMainnet.id })}
                className="ml-4 shrink-0 bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Switch to Tempo
              </button>
            </div>
          )}

          {/* Connector-specific fee guidance */}
          {!isInjectedWallet && !isWrongChain && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <p className="text-green-300 text-xs">
                Using Tempo Transaction connector — gas fees will be paid in
                USDC (<span className="font-mono">0x20c0...8b50</span>)
              </p>
            </div>
          )}

          {/* Step 1 (injected wallets only): Set Fee Token */}
          {isInjectedWallet && !isWrongChain && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold">Step 1: Set Fee Token</h2>
                {feeTokenIsSet && (
                  <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/50 rounded-full px-2 py-0.5">
                    Set
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Browser wallets (MetaMask, etc.) send standard EVM transactions.
                You must register a USD stablecoin as your fee token first.{" "}
                <span className="text-zinc-300">
                  Find your token address on{" "}
                  <a
                    href={`${explorerUrl}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    the block explorer
                  </a>
                  .
                </span>
              </p>

              {feeTokenIsSet ? (
                <div className="text-sm text-zinc-400">
                  Current fee token:{" "}
                  <code className="text-zinc-200 font-mono text-xs">
                    {currentFeeToken}
                  </code>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={feeTokenInput}
                    onChange={(e) => setFeeTokenInput(e.target.value)}
                    placeholder="0x20c0... (your USD stablecoin address)"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSetFeeToken}
                    disabled={
                      settingFeeToken ||
                      confirmingFeeToken ||
                      !isAddress(feeTokenInput)
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {settingFeeToken
                      ? "Sending..."
                      : confirmingFeeToken
                        ? "Confirming..."
                        : "Set Fee Token"}
                  </button>

                  {feeTokenConfirmed && (
                    <p className="text-green-400 text-sm">
                      Fee token set! You can now deploy.
                    </p>
                  )}
                  {setFeeTokenError && (
                    <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono mt-2">
                      {setFeeTokenError instanceof Error
                        ? setFeeTokenError.message
                        : String(setFeeTokenError)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 (or only step for Tempo connectors): Deploy */}
          {!isWrongChain && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                {isInjectedWallet ? "Step 2: " : ""}Deploy Contract
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Network
                  </label>
                  <p className="text-white font-mono">
                    {chain?.name} (Chain ID: {chain?.id})
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Deployer (Owner)
                  </label>
                  <p className="text-white font-mono text-sm break-all">
                    {address}
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm text-zinc-400 mb-1"
                    htmlFor="feeCollector"
                  >
                    Fee Collector Address
                  </label>
                  <input
                    id="feeCollector"
                    type="text"
                    value={feeCollector}
                    onChange={(e) => setFeeCollector(e.target.value)}
                    placeholder={address}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Leave blank to use your wallet address. Receives 0.5%
                    protocol fees.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDeploy}
                disabled={deploying || confirming || !canDeploy}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {!canDeploy
                  ? "Set fee token first"
                  : deploying
                    ? "Sending Transaction..."
                    : confirming
                      ? "Confirming..."
                      : "Deploy Contract"}
              </button>
            </div>
          )}
        </div>
      )}

      {(deploying || confirming || contractAddress) && (
        <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
          <p className="text-blue-300 text-sm">
            {deploying
              ? "Sending deployment transaction..."
              : confirming
                ? "Transaction submitted. Waiting for confirmation..."
                : "Deployed successfully!"}
          </p>
        </div>
      )}

      {txHash && (
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <label className="block text-sm text-zinc-400 mb-1">
            Transaction Hash
          </label>
          <p className="text-white font-mono text-sm break-all">{txHash}</p>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
            >
              View on Explorer
            </a>
          )}
        </div>
      )}

      {contractAddress && (
        <div className="mt-4 bg-green-900/20 border border-green-700/50 rounded-xl p-6">
          <label className="block text-sm font-medium text-green-400 mb-1">
            Contract Deployed!
          </label>
          <p className="text-white font-mono text-sm break-all mb-3">
            {contractAddress}
          </p>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm inline-block mb-4"
            >
              View on Explorer
            </a>
          )}
          <div className="mt-4 bg-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-2">
              Update <code>src/config/contracts.ts</code> with:
            </p>
            <pre className="text-sm text-green-300 font-mono break-all">
              {`export const ESCROW_CONTRACT_ADDRESS = "${contractAddress}" as const;`}
            </pre>
          </div>
        </div>
      )}

      {deployError_ && (
        <div className="mt-4 bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-red-400 mb-2">Error</h3>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
            {deployError_ instanceof Error
              ? deployError_.message
              : String(deployError_)}
          </pre>
        </div>
      )}
    </div>
  );
}
