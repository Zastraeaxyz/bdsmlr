/**
 * Policy for talking to BDSMLR's API from the server.
 *
 * BDSMLR sits behind Cloudflare, which rate limits and challenges the single
 * IP our server calls from. When that happens every user of this site sees the
 * failure, so the proxy:
 *
 *   - limits how many upstream calls run at once,
 *   - folds duplicate reads into one request,
 *   - keeps a very short cache for feed endpoints,
 *   - stops calling upstream for a few seconds once it has been challenged,
 *   - and turns Cloudflare's HTML challenge into a JSON 429 so the client can
 *     tell the user what is actually happening.
 */

export const RATE_LIMIT_CODE = "UPSTREAM_RATE_LIMITED";
export const UNAVAILABLE_CODE = "UPSTREAM_UNAVAILABLE";
export const NETWORK_CODE = "UPSTREAM_UNREACHABLE";

/** Endpoints that only read data. Only these are deduplicated and cached. */
const READ_PATHS = new Set([
  "/v2/api/blog-follow-graph",
  "/v2/api/blog-follow-state",
  "/v2/api/blog-tag-affinity",
  "/v2/api/for-you",
  "/v2/api/get-blocked",
  "/v2/api/get-blog",
  "/v2/api/get-post-detail",
  "/v2/api/list-blog-activity",
  "/v2/api/list-blog-family-blogs",
  "/v2/api/list-blog-top-tags",
  "/v2/api/list-blogs-recent-activity",
  "/v2/api/list-post-comments",
  "/v2/api/list-post-likes",
  "/v2/api/list-post-reblogs",
  "/v2/api/list-recommended-blogs",
  "/v2/api/related-posts",
  "/v2/api/resolve-identifier",
  "/v2/api/search-blogs",
  "/v2/api/search-posts-by-tag",
]);

/**
 * Short server-side cache for endpoints that are loaded again and again by the
 * same session. Kept deliberately small: a rate limit must never be cached and
 * feeds should not look stale.
 */
const MICRO_CACHE_TTL_MS: Record<string, number> = {
  "/v2/api/list-blog-activity": 15_000,
  "/v2/api/list-blogs-recent-activity": 15_000,
};

const MAX_CACHE_ENTRIES = 200;
const MAX_UPSTREAM_BYTES = 8 * 1024 * 1024;

export interface UpstreamFailure {
  code: string;
  status: number;
  retryAfterSeconds: number;
  message: string;
}

export interface UpstreamResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: ArrayBuffer | null;
}

export type UpstreamOutcome = UpstreamResponse | { failure: UpstreamFailure };

export function isUpstreamFailure(
  outcome: UpstreamOutcome,
): outcome is { failure: UpstreamFailure } {
  return "failure" in outcome;
}

export function isReadPath(pathname: string): boolean {
  return READ_PATHS.has(pathname);
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 300);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  const delta = Math.ceil((date - Date.now()) / 1000);
  return delta > 0 ? Math.min(delta, 300) : 0;
}

/**
 * Recognises answers that are really Cloudflare refusing us rather than data
 * from BDSMLR. `null` means the response is BDSMLR's own answer.
 */
export function classifyUpstreamResponse(
  status: number,
  headers: Headers,
): UpstreamFailure | null {
  const mitigated = headers.get("cf-mitigated");
  const contentType = headers.get("content-type") ?? "";
  const isHtml = contentType.toLowerCase().includes("text/html");
  const retryAfter = parseRetryAfter(headers.get("retry-after"));

  if (status === 429 || mitigated === "challenge") {
    return {
      code: RATE_LIMIT_CODE,
      status: 429,
      retryAfterSeconds: retryAfter ?? 60,
      message:
        "BDSMLR is rate limiting requests right now. This usually clears in a minute or two.",
    };
  }

  // Cloudflare error pages (520-527) and HTML 5xx pages mean BDSMLR's edge
  // failed; the JSON body the app expects will never arrive.
  if ((status >= 520 && status <= 527) || (isHtml && status >= 500)) {
    return {
      code: UNAVAILABLE_CODE,
      status: 503,
      retryAfterSeconds: retryAfter ?? 30,
      message: "BDSMLR is having trouble responding right now.",
    };
  }

  // A 403 with an HTML body is a Cloudflare block, not an API permission error
  // (the API answers in JSON).
  if (status === 403 && isHtml) {
    return {
      code: RATE_LIMIT_CODE,
      status: 429,
      retryAfterSeconds: retryAfter ?? 120,
      message:
        "BDSMLR is temporarily refusing requests from this site. It clears up on its own.",
    };
  }

  return null;
}

/**
 * Cache headers are only ever set from a successful response. Caching a 429 or
 * a 500 makes a short hiccup look like a broken blog for minutes or hours.
 */
export function cacheControlFor(pathname: string, status: number): string {
  if (status < 200 || status >= 300) return "no-store";
  return CACHE_CONTROL[pathname] ?? "public, max-age=60";
}

const CACHE_CONTROL: Record<string, string> = {
  "/v2/api/auth/login": "no-store",
  "/v2/api/sign-url": "no-store",
  "/v2/api/resolve-identifier": "public, max-age=86400",
  "/v2/api/get-blog": "public, max-age=1800",
  "/v2/api/blog-follow-graph": "public, max-age=300",
  "/v2/api/list-blog-top-tags": "public, max-age=1800",
  "/v2/api/get-post-detail": "public, max-age=60",
  "/v2/api/list-blog-activity": "no-store",
  "/v2/api/search-posts-by-tag": "public, max-age=60",
  "/v2/api/list-blogs-recent-activity": "public, max-age=60",
};

export function microCacheTtl(pathname: string): number {
  return MICRO_CACHE_TTL_MS[pathname] ?? 0;
}

function hashCookie(cookie: string): string {
  let hash = 2166136261;
  for (let index = 0; index < cookie.length; index += 1) {
    hash ^= cookie.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(
  method: string,
  pathname: string,
  search: string,
  body: string | undefined,
  cookie: string,
): string {
  return [
    method,
    pathname,
    search,
    body ?? "",
    cookie ? hashCookie(cookie) : "-",
  ].join("\u0000");
}

class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

export interface UpstreamRequest {
  method: string;
  pathname: string;
  search: string;
  body?: string;
  headers: Headers;
}

export interface GatewayOptions {
  origin: string;
  maxConcurrent?: number;
  timeoutMs?: number;
  breakerMs?: number;
}

interface CacheEntry {
  expiresAt: number;
  outcome: UpstreamResponse;
}

/**
 * Wraps upstream calls with concurrency, deduplication, a micro cache and a
 * breaker that opens after Cloudflare refuses us.
 */
export class UpstreamGateway {
  private readonly origin: string;
  private readonly semaphore: Semaphore;
  private readonly timeoutMs: number;
  private readonly breakerMs: number;
  private readonly inflight = new Map<string, Promise<UpstreamOutcome>>();
  private readonly cache = new Map<string, CacheEntry>();
  private blockedUntil = 0;
  private activeFailure: UpstreamFailure | null = null;

  constructor(options: GatewayOptions) {
    this.origin = options.origin;
    this.semaphore = new Semaphore(options.maxConcurrent ?? 6);
    this.timeoutMs = options.timeoutMs ?? 25_000;
    this.breakerMs = options.breakerMs ?? 20_000;
  }

  /** Current refusal, if BDSMLR (via Cloudflare) is still blocking us. */
  block(): UpstreamFailure | null {
    if (this.activeFailure && Date.now() < this.blockedUntil) {
      return this.activeFailure;
    }
    this.activeFailure = null;
    return null;
  }

  async request(request: UpstreamRequest): Promise<UpstreamOutcome> {
    const read = isReadPath(request.pathname);
    const ttl = read ? microCacheTtl(request.pathname) : 0;
    const cookie = request.headers.get("cookie") ?? "";
    const key =
      ttl > 0
        ? cacheKey(
            request.method,
            request.pathname,
            request.search,
            request.body,
            cookie,
          )
        : "";

    const blocked = read ? this.block() : null;
    if (blocked) return { failure: blocked };

    if (key) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.outcome;
      }
      const running = this.inflight.get(key);
      if (running) return running;
    }

    const pending = this.perform(request, read);
    if (key) {
      this.inflight.set(key, pending);
      void pending.finally(() => this.inflight.delete(key));
    }

    const outcome = await pending;
    if (key && !isUpstreamFailure(outcome)) {
      this.store(key, outcome, ttl);
    }
    return outcome;
  }

  private store(key: string, outcome: UpstreamResponse, ttl: number): void {
    if (ttl <= 0) return;
    if (outcome.status < 200 || outcome.status >= 300) return;
    if (outcome.body && outcome.body.byteLength > MAX_UPSTREAM_BYTES) return;
    // A per-session response must not be handed to another session.
    if (outcome.headers.get("set-cookie")) return;
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(key, { expiresAt: Date.now() + ttl, outcome });
  }

  private async perform(
    request: UpstreamRequest,
    read: boolean,
  ): Promise<UpstreamOutcome> {
    await this.semaphore.acquire();
    try {
      const response = await fetch(
        `${this.origin}${request.pathname}${request.search}`,
        {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );

      const failure = classifyUpstreamResponse(
        response.status,
        response.headers,
      );
      if (failure) {
        await response.body?.cancel().catch(() => {});
        this.noteFailure(failure, read);
        return { failure };
      }

      const body = await response.arrayBuffer();
      if (read) this.clearFailure();
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body,
      };
    } catch {
      const failure: UpstreamFailure = {
        code: NETWORK_CODE,
        status: 503,
        retryAfterSeconds: 15,
        message: "Could not reach BDSMLR.",
      };
      return { failure };
    } finally {
      this.semaphore.release();
    }
  }

  private noteFailure(failure: UpstreamFailure, read: boolean): void {
    if (!read) return;
    this.activeFailure = failure;
    this.blockedUntil =
      Date.now() +
      Math.max(5_000, Math.min(this.breakerMs, failure.retryAfterSeconds * 1000));
  }

  private clearFailure(): void {
    this.activeFailure = null;
    this.blockedUntil = 0;
  }
}
