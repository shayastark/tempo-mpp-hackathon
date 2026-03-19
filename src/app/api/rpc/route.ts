import { NextRequest, NextResponse } from "next/server";

// Upstream RPC endpoint (no credentials in the URL — Node.js fetch/undici
// does not support user:pass@host and silently fails with a 500).
const UPSTREAM_URL =
  process.env.TEMPO_RPC_URL ?? "https://rpc.tempo.xyz";

// Basic-auth credentials sent via Authorization header instead.
const UPSTREAM_AUTH =
  process.env.TEMPO_RPC_AUTH ??
  "Basic " + btoa("gracious-knuth:goofy-chandrasekhar");

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(UPSTREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: UPSTREAM_AUTH,
    },
    body,
  });

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
