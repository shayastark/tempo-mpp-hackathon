# TempoEscrow - Hybrid Non-Custodial Escrow on Tempo

A hybrid escrow system built on the Tempo blockchain with non-custodial locks, agent-triggered releases, and social-layer agnostic design.

## Features

- **Non-Custodial Lock**: Funds are locked in a smart contract with clear per-escrow ownership tracking. No intermediary holds your tokens.
- **Agent-Triggered Release**: Authorized agents approve fund releases. Supports single-agent, multi-sig, and time-locked conditions.
- **Social-Layer Agnostic**: Optional Farcaster or X (Twitter) verification. Works standalone or with social identity for trust.
- **Sub-Cent Fees**: Built on Tempo with TIP-20 stablecoins. Transfers cost ~$0.001 with dedicated payment lanes.
- **Dispute Resolution**: Built-in dispute mechanism with owner arbitration.
- **TIP-20 Memo Support**: 32-byte memo field on all escrow releases for payment references.

## Architecture

```
contracts/
├── interfaces/
│   └── ITIP20.sol          # TIP-20 token interface
└── src/
    └── TempoEscrow.sol     # Core escrow contract

app/                         # Next.js frontend
├── src/
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── create/          # Create escrow flow
│   │   ├── dashboard/       # User dashboard
│   │   ├── escrow/          # Escrow detail view
│   │   └── agent/           # Agent management panel
│   ├── components/
│   │   ├── Providers.tsx    # wagmi + react-query providers
│   │   ├── ConnectWallet.tsx
│   │   ├── Header.tsx
│   │   └── EscrowCard.tsx
│   ├── config/
│   │   ├── chains.ts        # Tempo chain definitions
│   │   ├── contracts.ts     # ABI + addresses
│   │   └── wagmi.ts         # wagmi configuration
│   └── hooks/
│       └── useEscrow.ts     # Contract interaction hooks
```

## Release Conditions

| Condition | Description |
|-----------|-------------|
| **Agent Approval** | Single authorized agent approves release |
| **Time Lock** | Auto-releases after a specified timestamp |
| **Multi-Sig** | N-of-M agents must approve before release |
| **Social Verified** | Agent verifies off-chain social proof (Farcaster/X) then triggers release |

## Smart Contract

The `TempoEscrow` contract supports:
- Creating escrows with TIP-20 tokens
- Four release condition types
- 0.5% protocol fee on releases
- Automatic refund after deadline expiry
- Dispute resolution with owner arbitration
- Social verification metadata (platform + handle)

## Getting Started

```bash
# Install dependencies
cd app && npm install

# Run development server
npm run dev
```

## Tech Stack

- **Blockchain**: Tempo (TIP-20 stablecoins)
- **Smart Contracts**: Solidity 0.8.24
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Web3**: wagmi v3, viem v2
- **State**: TanStack React Query
