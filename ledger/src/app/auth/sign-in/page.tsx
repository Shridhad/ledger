import { auth } from "@/lib/auth/server";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const { data: session } = await auth.getSession();
  return <SignInForm signedIn={Boolean(session?.user)} />;
}
