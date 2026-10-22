"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  AuthShell,
  Field,
  oauthLoginSearch,
  redirectAfterAuth,
  signInWithGoogle,
} from "../sign-in/form";

async function signUpWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const { error, data } = await authClient.signUp.email({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: error.message || "Could not create the account." };
  }

  redirectAfterAuth(data);
  return null;
}

export default function SignUpPage() {
  const [busy, setBusy] = useState(false);
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const oauthSearch = useMemo(() => oauthLoginSearch(), []);

  async function continueWithGoogle() {
    setBusy(true);
    const { error } = await signInWithGoogle();
    if (error) setBusy(false);
  }

  return (
    <AuthShell
      title="Open a ledger"
      footer={
        <>
          Already have one?{" "}
          <Link href={`/auth/sign-in${oauthSearch}`} className="underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <Field id="name" label="Name" type="text" required />
        <Field id="email" label="Email" type="email" required />
        <Field id="password" label="Password" type="password" required />
        {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink py-2.5 text-sm tracking-wide text-paper-2 uppercase"
        >
          {isPending ? "Creating…" : "Create account"}
        </button>
      </form>
      <button
        onClick={continueWithGoogle}
        disabled={busy}
        className="mt-3 w-full border border-rule py-2.5 text-sm tracking-wide uppercase hover:border-ink"
      >
        Continue with Google
      </button>
    </AuthShell>
  );
}
