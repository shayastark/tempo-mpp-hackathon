"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export default function MppTestPage() {
  const { isConnected } = useAccount();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testPaidPing = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // This uses the polyfilled global fetch which auto-handles 402
      const res = await fetch("https://mpp.dev/api/ping/paid");
      const data = await res.text();
      setResult(`Status: ${res.status}\n\n${data}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const testFreePing = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("https://mpp.dev/api/ping");
      const data = await res.text();
      setResult(`Status: ${res.status}\n\n${data}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">MPP Integration Test</h1>
      <p className="text-zinc-400 mb-8">
        Test the Machine Payments Protocol integration. The polyfilled fetch
        automatically handles 402 Payment Required responses.
      </p>

      {!isConnected && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm mb-6">
          Connect your wallet to enable automatic payments via MPP.
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <button
          onClick={testFreePing}
          disabled={loading}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? "Loading..." : "Test Free Ping"}
        </button>
        <button
          onClick={testPaidPing}
          disabled={loading || !isConnected}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? "Loading..." : "Test Paid Ping (402)"}
        </button>
      </div>

      {result && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-green-400 mb-2">Response</h3>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-red-400 mb-2">Error</h3>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
}
