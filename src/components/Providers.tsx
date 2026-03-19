"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/config/wagmi";
import { useState, useEffect } from "react";
import { MppProvider } from "./MppProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Defer rendering until client has hydrated to prevent wagmi localStorage
  // reconnect from causing a server/client HTML mismatch (React error #418).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MppProvider>{mounted ? children : null}</MppProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
