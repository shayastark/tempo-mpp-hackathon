"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

const CONNECTOR_LABELS: Record<string, string> = {
  webAuthn: "Passkey",
  dangerous_secp256k1: "Dev Wallet",
  injected: "Browser Wallet",
};

const CONNECTOR_STYLES: Record<string, string> = {
  webAuthn: "bg-indigo-600 hover:bg-indigo-500",
  dangerous_secp256k1: "bg-amber-600 hover:bg-amber-500",
  injected: "bg-zinc-700 hover:bg-zinc-600",
};

export function ConnectWallet() {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">
          {activeConnector?.name || "Connected"}
        </span>
        <span className="text-sm font-mono bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className={`text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            CONNECTOR_STYLES[connector.type] || "bg-zinc-700 hover:bg-zinc-600"
          }`}
        >
          {CONNECTOR_LABELS[connector.type] || connector.name}
        </button>
      ))}
    </div>
  );
}
