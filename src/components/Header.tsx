"use client";

import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              <span className="text-indigo-400">Tempo</span>Escrow
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/bounties"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Bounties
              </Link>
              <Link
                href="/create"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Post Bounty
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/agent"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Agent Panel
              </Link>
            </nav>
          </div>
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
