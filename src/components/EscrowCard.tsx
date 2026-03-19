"use client";

import Link from "next/link";
import { useEscrowData, isBounty } from "@/hooks/useEscrow";
import { formatUnits } from "viem";

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

export function EscrowCard({ escrowId }: { escrowId: bigint }) {
  const { data } = useEscrowData(escrowId);

  if (!data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
      </div>
    );
  }

  const amount = formatUnits(data.amount, 6);
  const deadline = new Date(Number(data.deadline) * 1000);
  const isOpenBounty = isBounty(data);

  return (
    <Link href={`/escrow?id=${escrowId.toString()}`}>
      <div className={`bg-zinc-900 border rounded-xl p-6 hover:border-zinc-600 transition-colors cursor-pointer ${
        isOpenBounty ? "border-amber-700/50" : "border-zinc-800"
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono">
                {isOpenBounty ? "Bounty" : "Escrow"} #{escrowId.toString()}
              </span>
              {isOpenBounty && data.status === "Active" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Open Bounty
                </span>
              )}
            </div>
            <h3 className="font-semibold mt-1">
              {data.description || (isOpenBounty ? "Untitled Bounty" : "Untitled Escrow")}
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              STATUS_COLORS[data.status] || STATUS_COLORS.Active
            }`}
          >
            {data.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Amount</span>
            <p className="font-mono font-medium">${amount}</p>
          </div>
          <div>
            <span className="text-zinc-500">Condition</span>
            <p>{CONDITION_LABELS[data.condition] || data.condition}</p>
          </div>
          <div>
            <span className="text-zinc-500">Deadline</span>
            <p>{deadline.toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex gap-4 mt-3 text-xs text-zinc-500 font-mono">
          <span>From: {data.depositor.slice(0, 6)}...{data.depositor.slice(-4)}</span>
          {isOpenBounty ? (
            <span className="text-amber-500">To: Anyone (Open Bounty)</span>
          ) : (
            <span>To: {data.recipient.slice(0, 6)}...{data.recipient.slice(-4)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
