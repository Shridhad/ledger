"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";

/** Signed OAuth Provider query (`sig` + `ba_param`), or empty when this is a normal Ledger login. */
export function oauthLoginSearch() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  if (!params.has("sig") || !params.has("ba_param")) return "";
  return window.location.search;
}

function postAuthPath(oauthSearch: string) {
  return oauthSearch ? `/auth/consent${oauthSearch}` : "/";
}

function hasPromptLogin() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("prompt") === "login";
}

export function redirectAfterAuth(data: unknown) {
  const url = (data as { url?: string } | undefined)?.url;
  window.location.assign(url ?? postAuthPath(oauthLoginSearch()));
}

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["id"];

function socialCallbackURL(): string {
  if (typeof window === "undefined") return "/";
  const search = oauthLoginSearch();
  if (search) return `${window.location.origin}/auth/sign-in${search}`;
  return `${window.location.origin}/`;
}

function socialProviderLabel(provider: SocialProvider): string {
  const match = SOCIAL_PROVIDERS.find((entry) => entry.id === provider);
  return match?.label ?? provider;
}

/** Return to /auth/sign-in with the signed OAuth query when present, else origin+/. */
export function signInWithSocial(provider: SocialProvider) {
  return authClient.signIn.social({
    provider,
    callbackURL: socialCallbackURL(),
  });
}

async function hasSession() {
  const { data } = await authClient.getSession();
  return Boolean(data?.user);
}

async function resumeOAuth() {
  const { error } = await authClient.oauth2.continue({ selected: true });
  if (error) return error.message || "Could not continue authorization.";
  return null;
}

async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const { error, data } = await authClient.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    return { error: error.message || "Could not sign in." };
  }

  redirectAfterAuth(data);
  return null;
}

export function SignInForm() {
  const [busy, setBusy] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
  const oauthSearch = useMemo(() => oauthLoginSearch(), []);
  const promptLogin = useMemo(() => hasPromptLogin(), []);

  useEffect(() => {
    if (!oauthSearch || promptLogin) return;
    let cancelled = false;
    (async () => {
      if (!(await hasSession()) || cancelled) return;
      setResuming(true);
      const message = await resumeOAuth();
      if (message && !cancelled) setResumeError(message);
    })();
    return () => {
      cancelled = true;
    };
  }, [oauthSearch, promptLogin]);

  async function continueWith(provider: SocialProvider) {
    setBusy(true);
    setSocialError(null);
    const { error } = await signInWithSocial(provider);
    if (error) {
      setSocialError(
        error.message || `Could not start ${socialProviderLabel(provider)} sign-in.`,
      );
      setBusy(false);
    }
  }

  if (resuming) {
    return (
      <AuthShell
        title="Continuing…"
        footer={<>Using your existing Ledger session.</>}
      >
        <p className="text-sm text-muted">
          You are already signed in. Sending you to authorize this client.
        </p>
        {resumeError ? <p className="mt-4 text-sm text-stamp">{resumeError}</p> : null}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in to Ledger"
      footer={
        <>
          New here?{" "}
          <Link href={`/auth/sign-up${oauthSearch}`} className="underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <Field id="email" label="Email" type="email" required />
        <Field id="password" label="Password" type="password" required />
        {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
        {socialError ? <p className="text-sm text-stamp">{socialError}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink py-2.5 text-sm tracking-wide text-paper-2 uppercase"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <SocialButtons busy={busy} onContinue={continueWith} />
    </AuthShell>
  );
}

type SocialButtonsProps = {
  busy: boolean;
  onContinue: (provider: SocialProvider) => void;
};

export function SocialButtons({ busy, onContinue }: SocialButtonsProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {SOCIAL_PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => onContinue(provider.id)}
          disabled={busy}
          className="w-full border border-rule py-2.5 text-sm tracking-wide uppercase hover:border-ink"
        >
          Continue with {provider.label}
        </button>
      ))}
    </div>
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
