import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_CODE,
  UNAVAILABLE_CODE,
  UpstreamGateway,
  cacheControlFor,
  classifyUpstreamResponse,
} from "./upstreamPolicy";

function headers(values: Record<string, string> = {}): Headers {
  return new Headers(values);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("classifyUpstreamResponse", () => {
  it("treats a 429 as a rate limit", () => {
    const failure = classifyUpstreamResponse(429, headers());
    expect(failure?.code).toBe(RATE_LIMIT_CODE);
    expect(failure?.status).toBe(429);
  });

  it("treats a Cloudflare challenge as a rate limit even without a 429", () => {
    const failure = classifyUpstreamResponse(
      200,
      headers({ "cf-mitigated": "challenge" }),
    );
    expect(failure?.code).toBe(RATE_LIMIT_CODE);
  });

  it("treats Cloudflare HTML error pages as unavailable", () => {
    const failure = classifyUpstreamResponse(
      522,
      headers({ "Content-Type": "text/html" }),
    );
    expect(failure?.code).toBe(UNAVAILABLE_CODE);
    expect(failure?.status).toBe(503);
  });

  it("treats an HTML 403 as a block", () => {
    const failure = classifyUpstreamResponse(
      403,
      headers({ "Content-Type": "text/html; charset=UTF-8" }),
    );
    expect(failure?.code).toBe(RATE_LIMIT_CODE);
  });

  it("leaves BDSMLR's own JSON answers alone", () => {
    expect(
      classifyUpstreamResponse(
        404,
        headers({ "Content-Type": "application/json" }),
      ),
    ).toBeNull();
    expect(
      classifyUpstreamResponse(
        400,
        headers({ "Content-Type": "application/json;charset=UTF-8" }),
      ),
    ).toBeNull();
    expect(classifyUpstreamResponse(200, headers())).toBeNull();
  });

  it("honours Retry-After when BDSMLR sends one", () => {
    const failure = classifyUpstreamResponse(
      429,
      headers({ "Retry-After": "12" }),
    );
    expect(failure?.retryAfterSeconds).toBe(12);
  });
});

describe("cacheControlFor", () => {
  it("only gives successful responses a max-age", () => {
    expect(cacheControlFor("/v2/api/resolve-identifier", 200)).toBe(
      "public, max-age=86400",
    );
    expect(cacheControlFor("/v2/api/get-blog", 200)).toBe(
      "public, max-age=1800",
    );
  });

  it("never caches errors", () => {
    expect(cacheControlFor("/v2/api/resolve-identifier", 429)).toBe("no-store");
    expect(cacheControlFor("/v2/api/get-blog", 429)).toBe("no-store");
    expect(cacheControlFor("/v2/api/get-blog", 500)).toBe("no-store");
    expect(cacheControlFor("/v2/api/get-post-detail", 404)).toBe("no-store");
  });
});

describe("UpstreamGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function gateway() {
    return new UpstreamGateway({
      origin: "https://upstream.test",
      maxConcurrent: 2,
      breakerMs: 5000,
    });
  }

  function request(pathname: string, body = '{"blog_id":1}') {
    return {
      method: "POST",
      pathname,
      search: "",
      body,
      headers: new Headers({ "Content-Type": "application/json" }),
    };
  }

  it("folds identical feed reads into one upstream call", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ posts: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const subject = gateway();
    const [first, second] = await Promise.all([
      subject.request(request("/v2/api/list-blog-activity")),
      subject.request(request("/v2/api/list-blog-activity")),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("serves a repeated feed read from the micro cache", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ posts: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const subject = gateway();
    await subject.request(request("/v2/api/list-blog-activity"));
    await subject.request(request("/v2/api/list-blog-activity"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not share responses between different bodies", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ posts: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const subject = gateway();
    await subject.request(request("/v2/api/list-blog-activity", '{"a":1}'));
    await subject.request(request("/v2/api/list-blog-activity", '{"a":2}'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops calling upstream after a rate limit", async () => {
    const fetchMock = vi.fn(
      async () => new Response("Just a moment...", { status: 429 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const subject = gateway();
    const first = await subject.request(
      request("/v2/api/list-blog-activity"),
    );
    const second = await subject.request(
      request("/v2/api/list-blog-activity", '{"a":2}'),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect("failure" in first && first.failure.code).toBe(RATE_LIMIT_CODE);
    expect("failure" in second && second.failure.code).toBe(RATE_LIMIT_CODE);
    expect(subject.block()?.status).toBe(429);
  });
});
