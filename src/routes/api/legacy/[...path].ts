import type { APIEvent } from "@solidjs/start/server";

const BASE = "https://bdsmlr.com";

function csrfToken(html: string): string | null {
  return (
    html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ??
    html.match(/id="token" type="hidden" value="([^"]+)"/)?.[1] ??
    null
  );
}

function cleanSetCookie(cookie: string): string {
  return cookie.replace(/;\s*domain=[^;]*/gi, "");
}

function sessionHeaders(event: APIEvent): Headers {
  const headers = new Headers(event.request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("content-length");
  return headers;
}

async function fetchCsrf(cookie: string, userAgent: string): Promise<string | null> {
  const res = await fetch(`${BASE}/dashboard`, {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookie,
    },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) return null;
  return csrfToken(await res.text());
}

async function tokenResponse(event: APIEvent): Promise<Response> {
  const url = new URL(event.request.url);
  const kind = url.searchParams.get("kind") ?? "";
  if (!["photo", "video", "music"].includes(kind)) {
    return json({ error: "Unknown upload type" }, 400);
  }
  const cookie = event.request.headers.get("cookie") ?? "";
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const csrf = await fetchCsrf(cookie, userAgent);
  if (!csrf) {
    return json({ error: "Sign in again to use the legacy composer" }, 401);
  }
  const page = await fetch(`${BASE}/add${kind}`, {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      "X-CSRF-TOKEN": csrf,
      Origin: BASE,
      Referer: `${BASE}/dashboard`,
      Cookie: cookie,
    },
    redirect: "manual",
  });
  if (page.status >= 300 && page.status < 400) {
    return json({ error: "Sign in again to use the legacy composer" }, 401);
  }
  if (page.status === 429) {
    return json({ error: "BDSMLR temporarily blocked the request. Try again shortly." }, 429);
  }
  const html = await page.text();
  const token = csrfToken(html);
  if (!token) return json({ error: "Could not start the upload" }, 502);
  return json({ token }, 200);
}

async function proxy(event: APIEvent): Promise<Response> {
  const url = new URL(event.request.url);
  const suffix = url.pathname.replace(/^\/api\/legacy/, "");
  if (suffix === "/token") return tokenResponse(event);

  const target = `${BASE}${suffix}${url.search}`;
  const method = event.request.method;
  const cookie = event.request.headers.get("cookie") ?? "";
  const userAgent = event.request.headers.get("user-agent") ?? "Mozilla/5.0";
  const headers = sessionHeaders(event);

  let body: string | ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = event.request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await event.request.arrayBuffer();
      headers.set("Content-Type", contentType);
    } else {
      body = await event.request.text();
      headers.set("Content-Type", contentType || "application/x-www-form-urlencoded");
    }
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Origin", BASE);
    headers.set("Referer", `${BASE}/dashboard`);

    const csrf = await fetchCsrf(cookie, userAgent);
    if (!csrf) return json({ error: "Sign in again to use the legacy composer" }, 401);
    headers.set("X-CSRF-TOKEN", csrf);
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    return json({ error: "Sign in again to use the legacy composer" }, 401);
  }
  if (upstream.status === 429) {
    return json({ error: "BDSMLR temporarily blocked the request. Try again shortly." }, 429);
  }
  if (upstream.status === 419) {
    return json({ error: "The BDSMLR security token expired. Try again." }, 419);
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
