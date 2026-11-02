import { AuthServerUnavailableError } from "@neon/oauth";
import { oauth } from "@/lib/oauth";

export async function GET(request: Request) {
  try {
    const result = await oauth.client.withAccessToken(
      request,
      async ({ authorizationHeaders }) => {
        const upstream = await fetch(
          `${process.env.LEDGER_REPORTS_URL}/summary`,
          {
            headers: authorizationHeaders,
            cache: "no-store",
          },
        );
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ?? "application/json",
          },
        });
      },
    );

    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 401 });
    }

    return result.response;
  } catch (err) {
    if (err instanceof AuthServerUnavailableError) {
      return new Response("Sign-in service unavailable, try again shortly.", {
        status: 503,
        headers: { "Retry-After": "5" },
      });
    }
    throw err;
  }
}
