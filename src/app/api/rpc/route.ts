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

  // Debug logging — shows every RPC method, key params, and response
  let parsed: { method?: string; params?: unknown[] } | undefined;
  try { parsed = JSON.parse(body); } catch {}
  const method = parsed?.method ?? "unknown";
  const shortParams = JSON.stringify(parsed?.params ?? []).slice(0, 300);
  console.log(`[RPC →] ${method} ${shortParams}`);

  const upstream = await fetch(UPSTREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: UPSTREAM_AUTH,
    },
    body,
  });

  const data = await upstream.text();

  // Log errors or short responses
  try {
    const resp = JSON.parse(data);
    if (resp.error) {
      console.log(`[RPC ←] ${method} ERROR:`, JSON.stringify(resp.error).slice(0, 500));
    } else {
      const resultStr = JSON.stringify(resp.result ?? "").slice(0, 200);
      console.log(`[RPC ←] ${method} OK: ${resultStr}`);
    }
  } catch {
    console.log(`[RPC ←] ${method} raw: ${data.slice(0, 200)}`);
  }

  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
