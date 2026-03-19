import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Hero */}
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
          <span className="text-indigo-400">Hybrid</span> Escrow
          <br />
          on <span className="text-indigo-400">Tempo</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          Non-custodial locks with agent-triggered releases. Social-layer
          agnostic — works with Farcaster, X, or standalone. Built on Tempo
          for sub-cent TIP-20 stablecoin transfers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            Create Escrow
          </Link>
          <Link
            href="/dashboard"
            className="border border-zinc-700 hover:border-zinc-500 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        <FeatureCard
          title="Non-Custodial Lock"
          description="Funds are locked in smart contract with clear ownership tracking. No intermediary holds your tokens."
          icon="lock"
        />
        <FeatureCard
          title="Agent-Triggered Release"
          description="Authorized agents approve fund releases. Supports single-agent, multi-sig, and time-locked conditions."
          icon="agent"
        />
        <FeatureCard
          title="Social-Layer Agnostic"
          description="Optional Farcaster or X verification. Works standalone or integrates social identity for trust."
          icon="social"
        />
        <FeatureCard
          title="Sub-Cent Fees"
          description="Built on Tempo with TIP-20 stablecoins. Transfers cost ~$0.001 with dedicated payment lanes."
          icon="fee"
        />
      </div>

      {/* How It Works */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <Step
            number={1}
            title="Deposit"
            description="Lock TIP-20 tokens in a non-custodial escrow with your chosen release conditions."
          />
          <Step
            number={2}
            title="Set Conditions"
            description="Choose agent approval, time-lock, multi-sig, or social verification release triggers."
          />
          <Step
            number={3}
            title="Verify"
            description="Agents verify conditions off-chain (deliverables, social proof, milestones)."
          />
          <Step
            number={4}
            title="Release"
            description="Agent triggers on-chain release. Funds transfer to recipient with TIP-20 memo."
          />
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-12">Use Cases</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <UseCase
            title="Freelance Payments"
            description="Lock payment at project start. Agent releases funds on milestone delivery. Dispute resolution built in."
          />
          <UseCase
            title="Social Bounties"
            description="Post bounties on Farcaster/X. Agent verifies completion via social proof and releases payment."
          />
          <UseCase
            title="P2P Trading"
            description="Escrow for OTC trades. Multi-sig agents ensure both parties fulfill their obligations."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  const icons: Record<string, string> = {
    lock: "\u{1F512}",
    agent: "\u{1F916}",
    social: "\u{1F310}",
    fee: "\u{26A1}",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500/50 transition-colors">
      <div className="text-3xl mb-4">{icons[icon]}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  );
}

function UseCase({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  );
}
