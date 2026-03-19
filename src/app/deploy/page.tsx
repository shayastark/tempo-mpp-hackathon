"use client";

import { useState } from "react";
import {
  useAccount,
  useDeployContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import artifact from "../../../contracts/artifacts/TempoEscrow.json";
import { tempoMainnet } from "@/config/chains";

export default function DeployPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [feeCollector, setFeeCollector] = useState("");
  const isWrongChain = chain?.id !== tempoMainnet.id;

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
  const error = deployError || receiptError;

  const handleDeploy = () => {
    if (!address) return;
    reset();

    const collector = (feeCollector.trim() || address) as `0x${string}`;

    deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as `0x${string}`,
      args: [collector],
    });
  };

  const explorerUrl = chain?.blockExplorers?.default?.url;

  const statusText = deploying
    ? "Sending deployment transaction..."
    : confirming
      ? "Transaction submitted. Waiting for confirmation..."
      : contractAddress
        ? "Deployed successfully!"
        : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Deploy TempoEscrow</h1>
      <p className="text-zinc-400 mb-8">
        Deploy the escrow smart contract to Tempo using your connected wallet.
        Your wallet will sign the deployment transaction.
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
                You are connected to <strong>{chain?.name || "an unsupported network"}</strong>.
                This contract must be deployed on <strong>Tempo</strong> (Chain ID {tempoMainnet.id}).
              </p>
              <button
                onClick={() => switchChain({ chainId: tempoMainnet.id })}
                className="ml-4 shrink-0 bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Switch to Tempo
              </button>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Deployment Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Network</label>
                <p className="text-white font-mono">{chain?.name} (Chain ID: {chain?.id})</p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Deployer (Owner)</label>
                <p className="text-white font-mono text-sm break-all">{address}</p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1" htmlFor="feeCollector">
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
                  Leave blank to use your wallet address. Receives 0.5% protocol fees.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying || confirming || isWrongChain}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {deploying
              ? "Sending Transaction..."
              : confirming
                ? "Confirming..."
                : "Deploy Contract"}
          </button>
        </div>
      )}

      {statusText && (
        <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
          <p className="text-blue-300 text-sm">{statusText}</p>
        </div>
      )}

      {txHash && (
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <label className="block text-sm text-zinc-400 mb-1">Transaction Hash</label>
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
          <label className="block text-sm font-medium text-green-400 mb-1">Contract Deployed!</label>
          <p className="text-white font-mono text-sm break-all mb-3">{contractAddress}</p>
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
            <p className="text-xs text-zinc-400 mb-2">Update <code>src/config/contracts.ts</code> with:</p>
            <pre className="text-sm text-green-300 font-mono break-all">
{`export const ESCROW_CONTRACT_ADDRESS = "${contractAddress}" as const;`}
            </pre>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-red-400 mb-2">Error</h3>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      )}
    </div>
  );
}
