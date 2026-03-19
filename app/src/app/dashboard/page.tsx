"use client";

import { useAccount } from "wagmi";
import { useUserEscrows, useRecipientEscrows } from "@/hooks/useEscrow";
import { useState } from "react";
import Link from "next/link";
import { EscrowCard } from "@/components/EscrowCard";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"deposited" | "receiving">("deposited");

  const { data: rawDepositedIds } = useUserEscrows(address);
  const { data: rawReceivingIds } = useRecipientEscrows(address);
  const depositedIds = rawDepositedIds as bigint[] | undefined;
  const receivingIds = rawReceivingIds as bigint[] | undefined;

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-zinc-400">Connect your wallet to view your escrows.</p>
      </div>
    );
  }

  const ids = tab === "deposited" ? depositedIds : receivingIds;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link
          href="/create"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Escrow
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 mb-8">
        <button
          onClick={() => setTab("deposited")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === "deposited"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Deposited ({depositedIds?.length || 0})
        </button>
        <button
          onClick={() => setTab("receiving")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === "receiving"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Receiving ({receivingIds?.length || 0})
        </button>
      </div>

      {/* Escrow List */}
      {ids && ids.length > 0 ? (
        <div className="space-y-4">
          {[...ids].reverse().map((id) => (
            <EscrowCard key={id.toString()} escrowId={id} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg">No escrows found</p>
          <p className="text-sm mt-2">
            {tab === "deposited"
              ? "Create your first escrow to get started."
              : "No one has sent you an escrow yet."}
          </p>
        </div>
      )}
    </div>
  );
}
