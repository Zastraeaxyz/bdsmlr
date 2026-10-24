import type { APIEvent } from "@solidjs/start/server";
import { parseDrafts } from "~/lib/legacyDrafts";

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(event: APIEvent) {
  const cookie = event.request.headers.get("cookie") ?? "";
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const page = await fetch("https://bdsmlr.com/drafts", {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to manage drafts" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR temporarily blocked the request. Try again shortly." }, 429);
  }

  return json({ drafts: parseDrafts(await page.text()) }, 200);
}
