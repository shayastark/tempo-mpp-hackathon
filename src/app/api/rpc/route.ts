import { NextRequest, NextResponse } from "next/server";

// RPC URL with credentials lives server-side only.
// Browsers block fetch requests to credentialed URLs (user:pass@host),
// so all RPC traffic is proxied through here instead.
const UPSTREAM =
  process.env.TEMPO_RPC_URL ??
  "https://gracious-knuth:goofy-chandrasekhar@rpc.tempo.xyz";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
