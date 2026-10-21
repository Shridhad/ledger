import { Ledger } from "@/components/ledger";
import { listTasks } from "./actions";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const initialTasks = await listTasks();

  return (
    <Ledger
      userName={session.user.name || "Operator"}
      userEmail={session.user.email || ""}
      initialTasks={initialTasks}
    />
  );
}
