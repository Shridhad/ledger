"use client";

import { createRealtimeClient } from "@neon/realtime/client";
import { drizzleParsers } from "@neon/realtime-drizzle/client";
import { RealtimeProvider } from "@neon/realtime-react";
import { type ReactNode, useState } from "react";

export function RealtimeRoot({ url, children }: { url: string; children: ReactNode }) {
  const [client] = useState(() =>
    createRealtimeClient({ url, parsers: { ...drizzleParsers } }),
  );
  return <RealtimeProvider client={client}>{children}</RealtimeProvider>;
}
