"use client";

import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Suspense, useState, useCallback } from "react";
import {
  useEscrowData,
  useEscrowAgents,
  useApproveRelease,
  useReleaseTimeLock,
  useReleaseSocialVerified,
  useRefundExpired,
  useDispute,
} from "@/hooks/useEscrow";

function EscrowDetailContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const escrowId = idParam ? BigInt(idParam) : BigInt(0);
  const { address } = useAccount();

  const { data: escrow, isLoading } = useEscrowData(escrowId);
  const { data: rawAgents } = useEscrowAgents(escrowId);
  const agents = rawAgents as `0x${string}`[] | undefined;
  const { approve, isPending: isApproving } = useApproveRelease();
  const { release: releaseTimeLock, isPending: isReleasingTimeLock } = useReleaseTimeLock();
  const { release: releaseSocial, isPending: isReleasingSocial } = useReleaseSocialVerified();
  const { refund, isPending: isRefunding } = useRefundExpired();
  const { disputeEscrow, isPending: isDisputing } = useDispute();

  if (isLoading || !escrow) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-64 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  const amount = formatUnits(escrow.amount, 6);
  const deadline = new Date(Number(escrow.deadline) * 1000);
  const releaseTime = Number(escrow.releaseTime) > 0 ? new Date(Number(escrow.releaseTime) * 1000) : null;
  const isDepositor = address?.toLowerCase() === escrow.depositor.toLowerCase();
  const isRecipient = address?.toLowerCase() === escrow.recipient.toLowerCase();
  const isAgent = agents?.some((a) => a.toLowerCase() === address?.toLowerCase());
  const isActive = escrow.status === "Active";
  const isExpired = deadline < new Date();
  const isBountyEscrow = escrow.recipient === "0x0000000000000000000000000000000000000000";

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/escrow?id=${idParam}` : "";
  const shareText = isBountyEscrow
    ? `${amount} USDC bounty: ${escrow.description || `Escrow #${idParam}`}`
    : `Escrow #${idParam} — ${amount} USDC`;

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const shareToX = useCallback(() => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  }, [shareText, shareUrl]);

  const shareToFarcaster = useCallback(() => {
    window.open(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
      "_blank"
    );
  }, [shareText, shareUrl]);

  const STATUS_COLORS: Record<string, string> = {
    Active: "bg-blue-500/20 text-blue-400",
    Released: "bg-green-500/20 text-green-400",
    Refunded: "bg-yellow-500/20 text-yellow-400",
    Disputed: "bg-red-500/20 text-red-400",
    Expired: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Escrow #{idParam}</h1>
        <span className={`text-sm px-3 py-1 rounded-full ${STATUS_COLORS[escrow.status]}`}>
          {escrow.status}
        </span>
        <div className="relative ml-auto">
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
          {shareOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={shareToX}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>
              <button
                onClick={shareToFarcaster}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.322 2h13.356v2.667H22V8h-1.61v9.333c0 .737-.597 1.334-1.334 1.334h-1.39c-.737 0-1.333-.597-1.333-1.334V12c0-1.472-1.194-2.667-2.667-2.667h-3.332C8.861 9.333 7.667 10.528 7.667 12v5.333c0 .737-.597 1.334-1.334 1.334H4.944c-.737 0-1.333-.597-1.333-1.334V8H2V4.667h3.322V2z" />
                </svg>
                Share on Farcaster
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Amount</label>
            <p className="text-2xl font-mono font-bold mt-1">${amount}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Condition</label>
            <p className="text-lg mt-1">
              {escrow.condition === "MultiSig"
                ? `Multi-Sig (${escrow.approvalCount.toString()}/${escrow.requiredApprovals.toString()})`
                : escrow.condition === "AgentApproval"
                ? "Agent Approval"
                : escrow.condition === "TimeLock"
                ? "Time Lock"
                : "Social Verified"}
            </p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Depositor</label>
            <p className="font-mono text-sm mt-1 break-all">{escrow.depositor}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Recipient</label>
            <p className="font-mono text-sm mt-1 break-all">{escrow.recipient}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Deadline</label>
            <p className="mt-1">{deadline.toLocaleString()}</p>
          </div>
          {releaseTime && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Auto-Release</label>
              <p className="mt-1">{releaseTime.toLocaleString()}</p>
            </div>
          )}
        </div>

        {escrow.description && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Description</label>
            <p className="mt-1 text-zinc-300">{escrow.description}</p>
          </div>
        )}
      </div>

      {/* Agents */}
      {agents && agents.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-3">Authorized Agents</h3>
          <div className="space-y-2">
            {agents.map((agent, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="font-mono text-sm text-zinc-300">{agent}</span>
                {agent.toLowerCase() === address?.toLowerCase() && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
          <h3 className="font-semibold mb-3">Actions</h3>

          {/* Agent Approval */}
          {isAgent && (escrow.condition === "AgentApproval" || escrow.condition === "MultiSig") && (
            <button
              onClick={() => approve(escrowId)}
              disabled={isApproving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isApproving ? "Approving..." : "Approve Release"}
            </button>
          )}

          {/* Social Verified Release */}
          {isAgent && escrow.condition === "SocialVerified" && (
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
          )}

          {/* TimeLock Release */}
          {escrow.condition === "TimeLock" && releaseTime && releaseTime <= new Date() && (
            <button
              onClick={() => releaseTimeLock(escrowId)}
              disabled={isReleasingTimeLock}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isReleasingTimeLock ? "Releasing..." : "Release (Time Lock Reached)"}
            </button>
          )}

          {/* Refund Expired */}
          {isExpired && (isDepositor || isRecipient) && (
            <button
              onClick={() => refund(escrowId)}
              disabled={isRefunding}
              className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isRefunding ? "Refunding..." : "Claim Refund (Expired)"}
            </button>
          )}

          {/* Dispute */}
          {(isDepositor || isRecipient) && (
            <button
              onClick={() => disputeEscrow(escrowId)}
              disabled={isDisputing}
              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 py-3 rounded-lg font-medium transition-colors"
            >
              {isDisputing ? "Filing Dispute..." : "Dispute Escrow"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EscrowDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
            <div className="h-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      }
    >
      <EscrowDetailContent />
    </Suspense>
  );
}
