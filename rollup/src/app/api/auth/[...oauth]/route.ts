import { createRouteHandlers } from "@neon/oauth/next";
import { oauth } from "@/lib/oauth";

export const { GET } = createRouteHandlers(oauth.client);
