import { oauth } from "@/lib/oauth";

export async function GET(request: Request) {
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
}
