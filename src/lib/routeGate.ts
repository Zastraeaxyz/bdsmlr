import { RESERVED_TOP_LEVEL } from "./appRoutes";

/**
 * How an incoming request should be treated by the sign-in gate.
 *
 * - `asset`: build output and static files, never gated.
 * - `public`: marketing and auth pages, reachable without a session.
 * - `profile`: profile URL. The header renders, but the feed does not load
 *   until the visitor signs in.
 * - `post`: a single post URL, readable without a session.
 * - `api`: an API route. These return their own 401 instead of a redirect, and
 *   the `/v2/api` proxy has its own guest allowlist.
 * - `gated`: everything else. Guests are redirected to `/login`.
 */
export type RouteGate =
  | "asset"
  | "public"
  | "profile"
  | "post"
  | "api"
  | "gated";

/** Pages that stay reachable without a session. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/about",
  "/changelog",
]);

/** Static file prefixes. */
const ASSET_PREFIXES = ["/_build/", "/assets/", "/previews/", "/.well-known/"];

/** Static files served from the site root. */
const ASSET_PATHS = new Set([
  "/favicon.ico",
  "/favicon.svg",
  "/icons.svg",
  "/og-default.png",
  "/robots.txt",
  "/rss-viewer.js",
  "/site.webmanifest",
]);

function normalize(pathname: string): string {
  const raw = (pathname || "/").split("?")[0].split("#")[0];
  if (raw.length > 1 && raw.endsWith("/")) return raw.replace(/\/+$/, "");
  return raw || "/";
}

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function classifyRoute(pathname: string): RouteGate {
  const path = normalize(pathname);

  if (ASSET_PATHS.has(path)) return "asset";
  if (ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) return "asset";

  if (PUBLIC_PATHS.has(path)) return "public";

  if (path === "/v2" || path.startsWith("/v2/")) return "api";
  if (path === "/api" || path.startsWith("/api/")) return "api";

  const parts = segments(path);
  const head = (parts[0] ?? "").toLowerCase();
  if (!head) return "public";

  if (head === "post") return "post";
  if (RESERVED_TOP_LEVEL.has(head)) return "gated";

  // Everything left is a profile URL.
  const second = parts[1]?.toLowerCase();
  if (second === "post") return "post";
  if (second === "rss") return "public";
  if (second === undefined) return "profile";
  return "gated";
}

const GUEST_PROXY_ENDPOINTS = new Set([
  "/v2/api/auth/login",
  "/v2/api/get-blog",
  "/v2/api/get-post-detail",
  "/v2/api/resolve-identifier",
]);

/**
 * API calls an anonymous visitor may still make: signing in, plus the three
 * lookups needed to render a shared post link and a profile header.
 */
export function isProxyAllowedForGuests(pathname: string): boolean {
  return GUEST_PROXY_ENDPOINTS.has(normalize(pathname));
}
