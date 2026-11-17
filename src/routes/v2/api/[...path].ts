import type { APIEvent } from "@solidjs/start/server";
import { hasCookie } from "~/lib/cookies";
import { isProxyAllowedForGuests } from "~/lib/routeGate";

const CACHE_CONFIG: Record<string, string> = {
  // Auth endpoints — never cache
  "/v2/api/auth/login": "no-store",
  "/v2/api/sign-url": "no-store",

  // Stable lookups — long cache
  "/v2/api/resolve-identifier": "public, max-age=86400",
  "/v2/api/get-blog": "public, max-age=1800",

  // Semi-stable — moderate cache
  "/v2/api/blog-follow-graph": "public, max-age=300",
  "/v2/api/list-blog-top-tags": "public, max-age=1800",

  // Post detail — short cache
  "/v2/api/get-post-detail": "public, max-age=60",

  // Feed/search — never cached
  "/v2/api/list-blog-activity": "no-store",
  "/v2/api/search-posts-by-tag": "public, max-age=60",
  "/v2/api/list-blogs-recent-activity": "public, max-age=60",
};

// Endpoints served as GET to the client (so the browser cache applies) but
// POSTed to the upstream BDSMLR API, which only accepts POST bodies.
const GET_ENDPOINTS: Record<
  string,
  { fields: Record<string, { key: string; type: "string" | "number" }> }
> = {
  "/v2/api/resolve-identifier": {
    fields: { blog_name: { key: "blog_name", type: "string" } },
  },
  "/v2/api/get-blog": {
    fields: { blogId: { key: "blogId", type: "string" } },
  },
  "/v2/api/get-post-detail": {
    fields: { post_id: { key: "post_id", type: "number" } },
  },
  "/v2/api/list-blog-top-tags": {
    fields: {
      blog_name: { key: "blog_name", type: "string" },
      page_size: { key: "page_size", type: "number" },
    },
  },
};

function getCacheControl(pathname: string): string {
  return CACHE_CONFIG[pathname] ?? "public, max-age=60";
}

async function proxy(event: APIEvent) {
  const url = new URL(event.request.url);
  const target = `https://api-prod.bdsmlr.com${url.pathname}${url.search}`;

  const authed = hasCookie(
    event.request.headers.get("cookie"),
    "v2_session",
  );
  if (!authed && !isProxyAllowedForGuests(url.pathname)) {
    return new Response(JSON.stringify({ error: "login required" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  let method = event.request.method;
  let body: string | undefined;
  const headers = new Headers(event.request.headers);

  if (method === "GET" && GET_ENDPOINTS[url.pathname]) {
    const endpoint = GET_ENDPOINTS[url.pathname];
    const payload: Record<string, string | number> = {};
    for (const [param, { key, type }] of Object.entries(endpoint.fields)) {
      const value = url.searchParams.get(param);
      if (value === null) continue;
      payload[key] = type === "number" ? Number(value) : value;
    }
    method = "POST";
    body = JSON.stringify(payload);
    headers.set("Content-Type", "application/json");
  } else if (method !== "GET" && method !== "HEAD") {
    body = await event.request.text();
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
  });

  const clean = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (
      lower !== "content-encoding" &&
      lower !== "content-length" &&
      lower !== "transfer-encoding"
    ) {
      if (lower === "set-cookie") {
        const cleaned = value.replace(/;\s*domain=[^;]*/gi, "");
        clean.headers.append(key, cleaned);
      } else {
        clean.headers.set(key, value);
      }
    }
  }

  clean.headers.set("Cache-Control", getCacheControl(url.pathname));

  return clean;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
