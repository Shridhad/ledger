"use client";

import { useEffect, useMemo, useState } from "react";

type PublicClient = {
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  redirect_uris?: string[];
};

function hostsFrom(uris: string[] | undefined) {
  return (uris ?? [])
    .map((uri) => {
      try {
        return new URL(uri).host;
      } catch {
        return uri;
      }
    })
    .filter(Boolean);
}

export default function ConsentPage() {
  const oauthQuery = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : window.location.search.startsWith("?")
          ? window.location.search.slice(1)
          : "",
    [],
  );
  const params = useMemo(() => new URLSearchParams(oauthQuery), [oauthQuery]);
  const clientId = params.get("client_id") ?? "";
  const scope = params.get("scope") ?? "openid";
  const resource = params.get("resource") ?? "";
  const [client, setClient] = useState<PublicClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const url = `/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`;
    fetch(url, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load client details.");
        setClient(await response.json());
      })
      .catch((err: Error) => setError(err.message));
  }, [clientId]);

  const redirectHosts = hostsFrom(client?.redirect_uris);
  const loopback = redirectHosts.every(
    (host) =>
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]"),
  );

  async function respond(accept: boolean) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: oauthQuery }),
    });
    if (!response.ok) {
      setBusy(false);
      setError(`Consent failed (${response.status}).`);
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.location.assign(payload.url);
      return;
    }
    setBusy(false);
    setError("Consent succeeded but no redirect URL was returned.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg border border-rule bg-paper-2/80 p-8">
        <p className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">
          Authorization
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Allow this client?
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          <span className="text-ink">{client?.client_name || clientId || "An MCP client"}</span>{" "}
          wants to use Ledger on your behalf.
        </p>
        {client?.client_uri ? (
          <p className="mt-2 font-mono text-xs text-muted">{client.client_uri}</p>
        ) : null}
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Redirect hosts</dt>
            <dd className="font-mono text-xs">{redirectHosts.join(", ") || "unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Resource</dt>
            <dd className="font-mono text-xs break-all">{resource || "not specified"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Scopes</dt>
            <dd className="font-mono text-xs">{scope}</dd>
          </div>
        </dl>
        {loopback ? (
          <p className="mt-4 border border-ochre/40 bg-ochre/10 p-3 text-sm">
            This client redirects to localhost. That usually means it is running on this
            machine. The name above is self-asserted — approve only if you started it.
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-stamp">{error}</p> : null}
        <div className="mt-8 flex gap-3">
          <button
            disabled={busy}
            onClick={() => respond(true)}
            className="flex-1 bg-ink py-2.5 text-sm tracking-wide text-paper-2 uppercase"
          >
            Allow
          </button>
          <button
            disabled={busy}
            onClick={() => respond(false)}
            className="flex-1 border border-rule py-2.5 text-sm tracking-wide uppercase"
          >
            Deny
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Tokens are issued by Managed Better Auth for this Neon branch.
        </p>
      </div>
    </main>
  );
}
