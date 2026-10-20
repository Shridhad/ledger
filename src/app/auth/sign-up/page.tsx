"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthShell, Field } from "../sign-in/page";

function oauthQueryFromLocation() {
  if (typeof window === "undefined") return "";
  return window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : "";
}

async function signUpWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const oauthQuery = String(formData.get("oauth_query") ?? "");
  const { error, data } = await authClient.signUp.email({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
  } as Parameters<typeof authClient.signUp.email>[0] & {
    oauth_query?: string;
  });

  if (error) {
    return { error: error.message || "Could not create the account." };
  }

  const redirectTo =
    (data as { url?: string } | undefined)?.url ??
    (oauthQuery ? `/auth/consent?${oauthQuery}` : "/");
  window.location.assign(redirectTo);
  return null;
}

export default function SignUpPage() {
  const [busy, setBusy] = useState(false);
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const oauthQuery = useMemo(oauthQueryFromLocation, []);

  async function signInWithGoogle() {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: oauthQuery ? `/auth/consent?${oauthQuery}` : "/",
      ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
    } as Parameters<typeof authClient.signIn.social>[0] & {
      oauth_query?: string;
    });
    if (error) setBusy(false);
  }

  return (
    <AuthShell
      title="Open a ledger"
      footer={
        <>
          Already have one?{" "}
          <Link href={`/auth/sign-in${oauthQuery ? `?${oauthQuery}` : ""}`} className="underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="oauth_query" value={oauthQuery} />
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
        onClick={signInWithGoogle}
        disabled={busy}
        className="mt-3 w-full border border-rule py-2.5 text-sm tracking-wide uppercase hover:border-ink"
      >
        Continue with Google
      </button>
    </AuthShell>
  );
}
