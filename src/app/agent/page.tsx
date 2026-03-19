"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  useEscrowData,
  useEscrowAgents,
  useApproveRelease,
  useReleaseSocialVerified,
  useReleaseTimeLock,
} from "@/hooks/useEscrow";

export default function AgentPanelPage() {
  const { address, isConnected } = useAccount();
  const [escrowIdInput, setEscrowIdInput] = useState("");
  const [selectedEscrowId, setSelectedEscrowId] = useState<bigint | null>(null);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Agent Panel</h1>
        <p className="text-zinc-400">Connect your wallet to access the agent panel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Agent Panel</h1>
      <p className="text-zinc-400 mb-8">
        Manage escrows you are authorized to release as an agent.
      </p>

      {/* Escrow Lookup */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-4">Look Up Escrow</h3>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Escrow ID"
            value={escrowIdInput}
            onChange={(e) => setEscrowIdInput(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setSelectedEscrowId(BigInt(escrowIdInput))}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {/* Selected Escrow Agent View */}
      {selectedEscrowId !== null && (
        <AgentEscrowView escrowId={selectedEscrowId} agentAddress={address!} />
      )}
    </div>
  );
}

function AgentEscrowView({
  escrowId,
  agentAddress,
}: {
  escrowId: bigint;
  agentAddress: `0x${string}`;
}) {
  const { data: escrow, isLoading } = useEscrowData(escrowId);
  const { data: rawAgents } = useEscrowAgents(escrowId);
  const agents = rawAgents as `0x${string}`[] | undefined;
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveRelease();
  const { release: releaseSocial, isPending: isReleasingSocial } = useReleaseSocialVerified();
  const { release: releaseTimeLock, isPending: isReleasingTimeLock } = useReleaseTimeLock();

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
        <div className="h-32 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
        <p className="text-red-400">Escrow not found.</p>
      </div>
    );
  }

  const isAgent = agents?.some((a) => a.toLowerCase() === agentAddress.toLowerCase());
  const amount = formatUnits(escrow.amount, 6);
  const isActive = escrow.status === "Active";
  const releaseTime = Number(escrow.releaseTime) > 0 ? new Date(Number(escrow.releaseTime) * 1000) : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">Escrow #{escrowId.toString()}</h3>
          <p className="text-zinc-400 text-sm mt-1">
            {escrow.description || "No description"}
          </p>
        </div>
        <span
          className={`text-sm px-3 py-1 rounded-full ${
            isActive
              ? "bg-blue-500/20 text-blue-400"
              : escrow.status === "Released"
              ? "bg-green-500/20 text-green-400"
              : "bg-zinc-500/20 text-zinc-400"
          }`}
        >
          {escrow.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <span className="text-xs text-zinc-500">Amount</span>
          <p className="font-mono font-bold">${amount}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Condition</span>
          <p className="text-sm">{escrow.condition}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Approvals</span>
          <p className="text-sm">
            {escrow.approvalCount.toString()}/{escrow.requiredApprovals.toString()}
          </p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Your Role</span>
          <p className="text-sm">{isAgent ? "Authorized Agent" : "Not Agent"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <span className="text-xs text-zinc-500">Depositor</span>
          <p className="font-mono text-xs break-all">{escrow.depositor}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Recipient</span>
          <p className="font-mono text-xs break-all">{escrow.recipient}</p>
        </div>
      </div>

      {/* Agent Actions */}
      {isActive && isAgent && (
        <div className="border-t border-zinc-800 pt-6 space-y-3">
          <h4 className="font-semibold text-sm text-zinc-300">Agent Actions</h4>

          {(escrow.condition === "AgentApproval" || escrow.condition === "MultiSig") && (
            <button
              onClick={() => approve(escrowId)}
              disabled={isApproving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isApproving
                ? "Approving..."
                : approveSuccess
                ? "Approved!"
                : "Approve Release"}
            </button>
          )}

          {escrow.condition === "SocialVerified" && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">
                Verify the social proof and release or reject.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => releaseSocial(escrowId, true)}
                  disabled={isReleasingSocial}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Verify & Release
                </button>
                <button
                  onClick={() => releaseSocial(escrowId, false)}
                  disabled={isReleasingSocial}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {escrow.condition === "TimeLock" && (
            <button
              onClick={() => releaseTimeLock(escrowId)}
              disabled={isReleasingTimeLock || (releaseTime !== null && releaseTime > new Date())}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {releaseTime && releaseTime > new Date()
                ? `Locked until ${releaseTime.toLocaleString()}`
                : isReleasingTimeLock
                ? "Releasing..."
                : "Release (Time Lock)"}
            </button>
          )}
        </div>
      )}

      {!isAgent && (
        <div className="border-t border-zinc-800 pt-6">
          <p className="text-zinc-500 text-sm">
            You are not an authorized agent for this escrow.
          </p>
        </div>
      )}

      {!isActive && (
        <div className="border-t border-zinc-800 pt-6">
          <p className="text-zinc-500 text-sm">
            This escrow is no longer active (status: {escrow.status}).
          </p>
        </div>
      )}
    </div>
  );
}
