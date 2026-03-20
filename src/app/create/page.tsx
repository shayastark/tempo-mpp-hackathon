"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { parseUnits, pad, toHex } from "viem";
import { useCreateEscrow, useApproveToken, useTokenBalance, ZERO_ADDRESS } from "@/hooks/useEscrow";
import { useFeeTokenGuard } from "@/hooks/useFeeTokenGuard";
import { DEFAULT_TOKEN } from "@/config/contracts";
import { formatUnits } from "viem";

const RELEASE_CONDITIONS = [
  { value: 0, label: "Agent Approval", description: "A single agent approves the release" },
  { value: 1, label: "Time Lock", description: "Auto-releases after a specified time" },
  { value: 2, label: "Multi-Sig", description: "Multiple agents must approve" },
  { value: 3, label: "Social Verified", description: "Agent verifies via Farcaster/X" },
];

export default function CreateEscrowPage() {
  const { address, isConnected } = useAccount();
  const { create, isPending: isCreating, isConfirming, isSuccess, error } = useCreateEscrow();
  const { approveToken, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproved, error: approveError } = useApproveToken();
  const {
    needsSetup: needsFeeToken,
    setFeeToken,
    isPending: isSettingFeeToken,
    isSuccess: feeTokenSet,
    error: feeTokenError,
  } = useFeeTokenGuard();

  const { data: rawBalance } = useTokenBalance(
    DEFAULT_TOKEN as `0x${string}`,
    address as `0x${string}` | undefined,
  );
  const balance = rawBalance != null ? formatUnits(rawBalance as bigint, 6) : null;

  const [isBounty, setIsBounty] = useState(false);
  const [step, setStep] = useState<"form" | "approve" | "create">("form");
  // Capture success in local state so it survives wagmi re-renders / state resets
  const [succeeded, setSucceeded] = useState(false);
  useEffect(() => { if (isSuccess) setSucceeded(true); }, [isSuccess]);
  // Auto-chain: when approve succeeds, immediately trigger createEscrow
  const [autoCreatePending, setAutoCreatePending] = useState(false);
  useEffect(() => {
    if (isApproved && step === "approve" && !autoCreatePending) {
      setAutoCreatePending(true);
      // Small delay to let UI update, then auto-create
      setTimeout(() => handleCreateFromForm(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproved, step]);
  const [form, setForm] = useState({
    recipient: "",
    token: DEFAULT_TOKEN,
    amount: "",
    deadline: "",
    releaseTime: "",
    condition: 0,
    agents: "",
    requiredApprovals: "1",
    memo: "",
    description: "",
    socialHandle: "",
    socialPlatform: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("approve");

    const amount = parseUnits(form.amount, 6); // TIP-20 uses 6 decimals
    approveToken(form.token as `0x${string}`, amount);
  };

  const handleCreateFromForm = () => {
    setStep("create");

    const amount = parseUnits(form.amount, 6);
    const deadlineTimestamp = BigInt(Math.floor(new Date(form.deadline).getTime() / 1000));
    const releaseTimestamp = form.releaseTime
      ? BigInt(Math.floor(new Date(form.releaseTime).getTime() / 1000))
      : BigInt(0);
    const agents = form.agents
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0) as `0x${string}`[];

    const memoBytes = form.memo
      ? pad(toHex(new TextEncoder().encode(form.memo).slice(0, 32)), { size: 32 })
      : ("0x" + "00".repeat(32)) as `0x${string}`;

    create({
      recipient: (isBounty ? ZERO_ADDRESS : form.recipient) as `0x${string}`,
      token: form.token as `0x${string}`,
      amount,
      deadline: deadlineTimestamp,
      releaseTime: releaseTimestamp,
      condition: form.condition,
      agents,
      requiredApprovals: BigInt(form.requiredApprovals),
      memo: memoBytes,
      description: form.description,
      socialHandle: form.socialHandle,
      socialPlatform: form.socialPlatform,
    });
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Create Escrow</h1>
        <p className="text-zinc-400">Please connect your wallet to create an escrow.</p>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-8">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            {isBounty ? "Bounty Created!" : "Escrow Created!"}
          </h2>
          <p className="text-zinc-300 mb-6">
            {isBounty
              ? "Your bounty is live. It will appear in the Bounties list shortly (the RPC may take a few seconds to index)."
              : "Your escrow has been created and is now on-chain."}
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {isBounty && (
              <Link
                href="/bounties"
                className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View Bounties
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Create Escrow</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Escrow Type Toggle */}
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <button
            type="button"
            onClick={() => setIsBounty(false)}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
              !isBounty
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Direct Escrow
          </button>
          <button
            type="button"
            onClick={() => setIsBounty(true)}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
              isBounty
                ? "bg-amber-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Open Bounty
          </button>
        </div>

        {isBounty && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
            <strong>Bounty Mode:</strong> No recipient is set upfront. An agent will assign the
            recipient when someone completes the bounty.
          </div>
        )}

        {/* Recipient (only for direct escrow) */}
        {!isBounty && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        )}

        {/* Token */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Token
          </label>
          <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-white font-medium">USDC</span>
            <span className="text-xs text-zinc-500 font-mono">
              {form.token.slice(0, 6)}...{form.token.slice(-4)}
            </span>
          </div>
          {balance != null && (
            <p className="text-xs text-zinc-400 mt-1">
              Balance: <span className="text-white font-medium">{balance} USDC</span>
              {" "}<span className="text-zinc-500">(also used for gas fees)</span>
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Amount (in token units)
          </label>
          <input
            type="number"
            step="0.000001"
            placeholder="100.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Release Condition */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Release Condition
          </label>
          <div className="grid grid-cols-2 gap-3">
            {RELEASE_CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, condition: c.value })}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  form.condition === c.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                }`}
              >
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-zinc-400 mt-1">{c.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Agent Address(es){" "}
            <span className="text-zinc-500">(comma-separated for multi-sig)</span>
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={form.agents}
            onChange={(e) => setForm({ ...form, agents: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            required={form.condition !== 1}
          />
        </div>

        {/* Multi-sig approvals */}
        {form.condition === 2 && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Required Approvals
            </label>
            <input
              type="number"
              min="1"
              value={form.requiredApprovals}
              onChange={(e) => setForm({ ...form, requiredApprovals: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Escrow Deadline
          </label>
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Release time for TimeLock */}
        {form.condition === 1 && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Auto-Release Time
            </label>
            <input
              type="datetime-local"
              value={form.releaseTime}
              onChange={(e) => setForm({ ...form, releaseTime: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description
          </label>
          <textarea
            placeholder="What is this escrow for?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Memo */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Payment Memo <span className="text-zinc-500">(optional, max 32 bytes)</span>
          </label>
          <input
            type="text"
            placeholder="Invoice #12345"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Social Layer (Optional) */}
        {(form.condition === 3 || form.socialHandle) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-zinc-200">Social Verification (Optional)</h3>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Platform</label>
              <select
                value={form.socialPlatform}
                onChange={(e) => setForm({ ...form, socialPlatform: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None</option>
                <option value="farcaster">Farcaster</option>
                <option value="x">X (Twitter)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Handle</label>
              <input
                type="text"
                placeholder="@username"
                value={form.socialHandle}
                onChange={(e) => setForm({ ...form, socialHandle: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Fee Token Setup (injected wallets only) */}
        {needsFeeToken && !feeTokenSet && step === "form" && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-5 space-y-3">
            <h3 className="font-medium text-amber-200 text-sm">
              One-time setup: Set fee token
            </h3>
            <p className="text-xs text-zinc-400">
              Browser wallets (Coinbase Wallet, MetaMask) require registering
              USDC as your gas fee token before sending transactions on Tempo.
            </p>
            <button
              type="button"
              onClick={setFeeToken}
              disabled={isSettingFeeToken}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {isSettingFeeToken
                ? "Confirm in wallet..."
                : "Set USDC as Fee Token"}
            </button>
            {feeTokenError && (
              <p className="text-xs text-red-400">
                {feeTokenError instanceof Error ? feeTokenError.message : String(feeTokenError)}
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        {step === "form" && (
          <button
            type="submit"
            disabled={isApproving || (needsFeeToken && !feeTokenSet)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium text-lg transition-colors"
          >
            {(needsFeeToken && !feeTokenSet) ? "Set fee token first" : isApproving ? "Approving Token..." : "Create Escrow"}
          </button>
        )}

        {step === "approve" && !isApproved && !approveError && (
          <button
            type="button"
            disabled
            className="w-full bg-zinc-700 text-white py-3 rounded-lg font-medium text-lg"
          >
            {isApproving ? "Approve in wallet..." : isApproveConfirming ? "Waiting for confirmation..." : "Approving..."}
          </button>
        )}

        {step === "approve" && isApproved && !isCreating && !isConfirming && (
          <button
            type="button"
            onClick={handleCreateFromForm}
            disabled={isCreating || isConfirming}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium text-lg transition-colors"
          >
            Confirm & Create Escrow
          </button>
        )}

        {(step === "create" || ((isCreating || isConfirming) && step === "approve")) && (
          <button
            type="button"
            disabled
            className="w-full bg-zinc-700 text-white py-3 rounded-lg font-medium text-lg"
          >
            {isCreating ? "Confirm in wallet..." : isConfirming ? "Waiting for confirmation..." : "Creating escrow..."}
          </button>
        )}

        {approveError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            <strong>Token approval failed:</strong> {approveError.message}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            {error.message}
          </div>
        )}
      </form>
    </div>
  );
}
