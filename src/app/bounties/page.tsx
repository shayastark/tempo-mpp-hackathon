"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useEscrowCount, useAllEscrowsData, isBounty, ZERO_ADDRESS, type EscrowData } from "@/hooks/useEscrow";
import { KNOWN_TOKENS } from "@/config/contracts";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Released: "bg-green-500/20 text-green-400 border-green-500/30",
  Refunded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Disputed: "bg-red-500/20 text-red-400 border-red-500/30",
  Expired: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const CONDITION_LABELS: Record<string, string> = {
  AgentApproval: "Agent Approval",
  TimeLock: "Time Lock",
  MultiSig: "Multi-Sig",
  SocialVerified: "Social Verified",
};

const PLATFORM_LABELS: Record<string, string> = {
  farcaster: "Farcaster",
  x: "X (Twitter)",
};

type Tab = "open" | "closed";

export default function BountiesPage() {
  const [tab, setTab] = useState<Tab>("open");
  const { data: rawCount, isLoading: countLoading } = useEscrowCount();
  const count = rawCount ? Number(rawCount) : 0;
  const { data: allEscrows, isLoading: escrowsLoading } = useAllEscrowsData(count);

  const isLoading = countLoading || escrowsLoading;

  const openBounties = allEscrows
    .filter((e) => e.status === "Active")
    .reverse();

  const closedBounties = allEscrows
    .filter((e) => e.status !== "Active")
    .reverse();

  const displayed = tab === "open" ? openBounties : closedBounties;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bounties</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Browse open bounties, submit your work, and get paid.
          </p>
        </div>
        <Link
          href="/create"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Post Bounty
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 mb-8">
        <button
          onClick={() => setTab("open")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === "open"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Open ({isLoading ? "…" : openBounties.length})
        </button>
        <button
          onClick={() => setTab("closed")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === "closed"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Closed ({isLoading ? "…" : closedBounties.length})
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse"
            >
              <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-3 bg-zinc-800 rounded"></div>
                <div className="h-3 bg-zinc-800 rounded"></div>
                <div className="h-3 bg-zinc-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg">
            {tab === "open" ? "No open bounties yet." : "No closed bounties yet."}
          </p>
          {tab === "open" && (
            <p className="text-sm mt-2">
              <Link href="/create" className="text-indigo-400 hover:text-indigo-300">
                Post the first bounty →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((escrow) => (
            <BountyCard key={escrow.id.toString()} escrow={escrow} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShareButton({ escrow, amount }: { escrow: EscrowData & { id: bigint }; amount: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/escrow?id=${escrow.id.toString()}` : "";
  const shareText = `${amount} USDC bounty: ${escrow.description || `Escrow #${escrow.id.toString()}`}`;

  const copyLink = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const shareToX = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  }, [shareText, shareUrl]);

  const shareToFarcaster = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://farcaster.xyz/~/compose?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
      "_blank"
    );
  }, [shareText, shareUrl]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Share bounty"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={shareToX}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>
          <button
            onClick={shareToFarcaster}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.322 2h13.356v2.667H22V8h-1.61v9.333c0 .737-.597 1.334-1.334 1.334h-1.39c-.737 0-1.333-.597-1.333-1.334V12c0-1.472-1.194-2.667-2.667-2.667h-3.332C8.861 9.333 7.667 10.528 7.667 12v5.333c0 .737-.597 1.334-1.334 1.334H4.944c-.737 0-1.333-.597-1.333-1.334V8H2V4.667h3.322V2z" />
            </svg>
            Share on Farcaster
          </button>
        </div>
      )}
    </div>
  );
}

function BountyCard({ escrow }: { escrow: EscrowData & { id: bigint } }) {
  const amount = formatUnits(escrow.amount, 6);
  const tokenSymbol =
    escrow.token.toLowerCase() === KNOWN_TOKENS.USDC.toLowerCase()
      ? "USDC"
      : "tokens";
  const deadline = new Date(Number(escrow.deadline) * 1000);
  const isOpen = isBounty(escrow);
  const isActive = escrow.status === "Active";
  const deadlinePassed = deadline < new Date();

  return (
    <Link href={`/escrow?id=${escrow.id.toString()}`}>
      <div
        className={`bg-zinc-900 border rounded-xl p-6 hover:border-zinc-500 transition-colors cursor-pointer ${
          isActive && !deadlinePassed
            ? "border-indigo-800/60"
            : "border-zinc-800"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-zinc-500 font-mono">
                #{escrow.id.toString()}
              </span>
              {isOpen && isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Open
                </span>
              )}
              {!isOpen && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
                  Assigned
                </span>
              )}
              {escrow.socialHandle && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {PLATFORM_LABELS[escrow.socialPlatform ?? ""] ?? escrow.socialPlatform}{" "}
                  {escrow.socialHandle}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-white truncate">
              {escrow.description || "Untitled Bounty"}
            </h3>
          </div>
          <span
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${
              STATUS_COLORS[escrow.status] ?? STATUS_COLORS.Active
            }`}
          >
            {escrow.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div>
            <span className="text-zinc-500 text-xs">Reward</span>
            <p className="font-mono font-semibold text-white">
              {amount} {tokenSymbol}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Verification</span>
            <p className="text-zinc-300">{CONDITION_LABELS[escrow.condition] ?? escrow.condition}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Deadline</span>
            <p className={deadlinePassed && isActive ? "text-red-400" : "text-zinc-300"}>
              {deadlinePassed && isActive ? "Expired" : deadline.toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-mono">
            Posted by {escrow.depositor.slice(0, 6)}…{escrow.depositor.slice(-4)}
          </span>
          <div className="flex items-center gap-2">
            {isOpen && isActive && !deadlinePassed ? (
              <span className="text-indigo-400 font-medium">Submit work →</span>
            ) : !isOpen ? (
              <span className="font-mono">
                Recipient: {escrow.recipient === ZERO_ADDRESS
                  ? "—"
                  : `${escrow.recipient.slice(0, 6)}…${escrow.recipient.slice(-4)}`}
              </span>
            ) : null}
            <ShareButton escrow={escrow} amount={amount} />
          </div>
        </div>
      </div>
    </Link>
  );
}
