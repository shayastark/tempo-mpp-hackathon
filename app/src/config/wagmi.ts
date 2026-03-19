"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { tempoTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [tempoTestnet],
  connectors: [injected()],
  transports: {
    [tempoTestnet.id]: http(),
  },
});
