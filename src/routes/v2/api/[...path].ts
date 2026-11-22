import type { APIEvent } from "@solidjs/start/server";
import {
  UpstreamGateway,
  cacheControlFor,
  isUpstreamFailure,
} from "~/server/upstreamPolicy";

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

const gateway = new UpstreamGateway({ origin: "https://api-prod.bdsmlr.com" });

/** Headers that must not be copied from the browser request or the answer. */
const SKIPPED_REQUEST_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-connection",
  "te",
  "transfer-encoding",
  "upgrade",
]);

const SKIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-connection",
  "te",
  "transfer-encoding",
  "upgrade",
]);

function upstreamHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const [key, value] of source) {
    if (SKIPPED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    headers.append(key, value);
  }
  return headers;
}

async function proxy(event: APIEvent) {
  const url = new URL(event.request.url);

  let method = event.request.method;
  let body: string | undefined;

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
  } else if (method !== "GET" && method !== "HEAD") {
    body = await event.request.text();
  }

  const headers = upstreamHeaders(event.request.headers);
  if (body !== undefined && method === "POST" && !headers.has("content-type")) {
    headers.set("Content-Type", "application/json");
  }

  const outcome = await gateway.request({
    method,
    pathname: url.pathname,
    search: url.search,
    body,
    headers,
  });

  if (isUpstreamFailure(outcome)) {
    // Never relay Cloudflare's HTML challenge: the client can classify a JSON
    // 429 and tell the user that BDSMLR is limiting us.
    return new Response(
      JSON.stringify({
        error: outcome.failure.message,
        code: outcome.failure.code,
        retryAfterSeconds: outcome.failure.retryAfterSeconds,
      }),
      {
        status: outcome.failure.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Retry-After": String(outcome.failure.retryAfterSeconds),
        },
      },
    );
  }

  const response = new Response(outcome.body, {
    status: outcome.status,
    statusText: outcome.statusText,
  });

  for (const [key, value] of outcome.headers) {
    if (SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value.replace(/;\s*domain=[^;]*/gi, ""));
    } else {
      response.headers.set(key, value);
    }
  }

  response.headers.set(
    "Cache-Control",
    cacheControlFor(url.pathname, outcome.status),
  );

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
