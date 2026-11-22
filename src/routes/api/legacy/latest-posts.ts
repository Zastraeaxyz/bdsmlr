import type { APIEvent } from "@solidjs/start/server";

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
  const page = await fetch("https://bdsmlr.com/massedit", {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to check the reblog" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR is rate limiting requests right now. This usually clears in a minute or two." }, 429);
  }
  if (!page.ok) {
    return json({ error: "Could not check the reblog" }, page.status);
  }

  const html = await page.text();
  const ids = [...html.matchAll(/<div class="postitem" data-id="(\d+)"/g)].map(
    (match) => Number(match[1]),
  );
  return json({ ids }, 200);
}
