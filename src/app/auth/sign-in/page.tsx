"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";

function oauthQueryFromLocation() {
  if (typeof window === "undefined") return "";
  return window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : "";
}

async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const oauthQuery = String(formData.get("oauth_query") ?? "");
  const { error, data } = await authClient.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
  } as Parameters<typeof authClient.signIn.email>[0] & {
    oauth_query?: string;
  });

  if (error) {
    return { error: error.message || "Could not sign in." };
  }

  const redirectTo =
    (data as { url?: string; redirect?: boolean } | undefined)?.url ??
    (oauthQuery ? `/auth/consent?${oauthQuery}` : "/");
  window.location.assign(redirectTo);
  return null;
}

export default function SignInPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
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
    if (error) {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to Ledger"
      footer={
        <>
          New here?{" "}
          <Link href={`/auth/sign-up${oauthQuery ? `?${oauthQuery}` : ""}`} className="underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="oauth_query" value={oauthQuery} />
        <Field id="email" label="Email" type="email" required />
        <Field id="password" label="Password" type="password" required />
        {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink py-2.5 text-sm tracking-wide text-paper-2 uppercase"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="mt-3 w-full border border-rule py-2.5 text-sm tracking-wide uppercase hover:border-ink"
      >
        Continue with Google
      </button>
      <button
        onClick={() => router.push("/")}
        className="sr-only"
        tabIndex={-1}
      />
    </AuthShell>
  );
}

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border border-rule bg-paper-2/80 p-8">
        <p className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">
          Ledger
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">{title}</h1>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}

export function Field({
  id,
  label,
  type,
  required,
}: {
  id: string;
  label: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs tracking-wide text-muted uppercase">
      {label}
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        className="mt-1 block w-full border border-rule bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink"
      />
    </label>
  );
}
