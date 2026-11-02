import "server-only";

import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";

type Realtime = ReturnType<typeof createRealtime>;

let realtime: Realtime | null | undefined;

export function getRealtimeUrl(): string | null {
  return process.env.NEON_REALTIME_URL ?? null;
}

export function getRealtime(): Realtime | null {
  if (realtime !== undefined) return realtime;
  const secret = process.env.NEON_REALTIME_SECRET;
  if (!secret) {
    realtime = null;
    return null;
  }
  realtime = createRealtime({
    secret,
    db: "neondb",
    adapter: drizzleAdapter(),
    debugMode: process.env.NODE_ENV === "development",
  });
  return realtime;
}
