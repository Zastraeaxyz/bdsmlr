import type { APIEvent } from "@solidjs/start/server";

const BASE = "https://bdsmlr.com/messages";

function cleanSetCookie(cookie: string): string {
  return cookie.replace(/;\s*domain=[^;]*/gi, "");
}

function csrfToken(html: string): string | null {
  return html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? null;
}

async function proxy(event: APIEvent) {
  const url = new URL(event.request.url);
  const suffix = url.pathname.replace(/^\/api\/messages/, "");
  const target = `${BASE}${suffix}${url.search}`;
  const method = event.request.method;
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const cookie = event.request.headers.get("cookie") ?? "";

  const headers = new Headers(event.request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("content-length");

  let body: string | ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = event.request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await event.request.text();
      headers.set("Content-Type", "application/json");
    } else {
      body = await event.request.arrayBuffer();
      if (contentType) headers.set("Content-Type", contentType);
    }
    headers.set("Accept", "application/json");
    headers.set("Origin", "https://bdsmlr.com");
    headers.set("Referer", `${BASE}/`);

    const page = await fetch(BASE, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
        Cookie: cookie,
      },
      redirect: "manual",
    });
    if (page.status >= 300 && page.status < 400) {
      return json({ error: "Sign in again to use messages" }, 401);
    }
    const token = csrfToken(await page.text());
    if (!token) return json({ error: "Could not verify BDSMLR session" }, 502);
    headers.set("X-CSRF-TOKEN", token);
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });
  if (upstream.status >= 300 && upstream.status < 400) {
    return json({ error: "Sign in again to use messages" }, 401);
  }
  if (upstream.status === 401) {
    return json({ error: "Sign in again to use messages" }, 401);
  }
  if (upstream.status === 419) {
    return json({ error: "Could not verify BDSMLR session. Sign in again." }, 401);
  }
  if (
    upstream.status === 429 ||
    upstream.headers.get("cf-mitigated") === "challenge"
  ) {
    return new Response(
      JSON.stringify({
        error:
          "BDSMLR is rate limiting requests right now. This usually clears in a minute or two.",
        code: "UPSTREAM_RATE_LIMITED",
        retryAfterSeconds: 60,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Retry-After": "60",
        },
      },
    );
  }
  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      continue;
    }
    if (lower === "set-cookie") {
      response.headers.append("Set-Cookie", cleanSetCookie(value));
    } else {
      response.headers.set(key, value);
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
