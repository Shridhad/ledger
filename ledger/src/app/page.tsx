import { Ledger } from "@/components/ledger";
import { RealtimeRoot } from "@/components/realtime-root";
import { loadTasks } from "@/lib/tasks-live";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const live = await loadTasks(session.user.id);
  const board = (
    <Ledger
      userName={session.user.name || "Operator"}
      userEmail={session.user.email || ""}
      initialTasks={live.tasks}
      sealedQuery={live.sealedQuery}
    />
  );

  if (!live.realtimeUrl || !live.sealedQuery) {
    return board;
  }

  return (
    <RealtimeRoot key={live.sealedQuery.queryFingerprint} url={live.realtimeUrl}>
      {board}
    </RealtimeRoot>
  );
}
