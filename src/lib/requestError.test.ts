import { describe, expect, it } from "vitest";
import { FetchError } from "./api";
import {
  describeRequestError,
  isDeletedPostError,
  isRateLimitMessage,
} from "./requestError";

describe("isRateLimitMessage", () => {
  it("matches the messages the proxy and legacy routes send", () => {
    expect(
      isRateLimitMessage(
        "BDSMLR is rate limiting requests right now. This usually clears in a minute or two.",
      ),
    ).toBe(true);
    expect(
      isRateLimitMessage("BDSMLR temporarily blocked the request."),
    ).toBe(true);
    expect(isRateLimitMessage("HTTP 429 Too Many Requests")).toBe(true);
  });

  it("does not match unrelated failures", () => {
    expect(isRateLimitMessage("This blog is private.")).toBe(false);
    expect(isRateLimitMessage("Blog was banned")).toBe(false);
    expect(isRateLimitMessage("")).toBe(false);
    expect(isRateLimitMessage(null)).toBe(false);
  });
});

describe("describeRequestError", () => {
  it("explains a rate limit without blaming the blog or the site", () => {
    const info = describeRequestError(
      new FetchError("BDSMLR is rate limiting requests.", 429),
    );
    expect(info.kind).toBe("rate_limited");
    expect(info.title).toBe("BDSMLR is limiting requests");
    expect(info.retryable).toBe(true);
    expect(info.message).toContain("not a problem with this site");
  });

  it("recognises the proxy's rate limit code", () => {
    const info = describeRequestError(
      new FetchError("Slow down", 429, "UPSTREAM_RATE_LIMITED"),
    );
    expect(info.kind).toBe("rate_limited");
  });

  it("keeps private blogs separate from rate limits", () => {
    const info = describeRequestError(
      "Cannot find any route matching [POST] https://example.test/v2/api/list-blog-activity",
    );
    expect(info.kind).toBe("private");
  });

  it("calls a server error a server error", () => {
    const info = describeRequestError(new FetchError("HTTP 502", 502));
    expect(info.kind).toBe("server");
  });

  it("explains a deleted post instead of repeating gone", () => {
    const info = describeRequestError(new FetchError("gone", 410));
    expect(info.kind).toBe("deleted_post");
    expect(info.title).toBe("This post was deleted");
    expect(info.message).toContain("nothing left to show");
    expect(info.retryable).toBe(false);
  });

  it("treats a network failure as a connection problem", () => {
    const info = describeRequestError(new FetchError("Could not reach BDSMLR.", 0));
    expect(info.kind).toBe("network");
  });
});

describe("isDeletedPostError", () => {
  it("matches the 410 the post detail endpoint returns", () => {
    expect(isDeletedPostError(new FetchError("gone", 410))).toBe(true);
  });

  it("matches the upstream wording even without a status", () => {
    expect(isDeletedPostError(new Error("gone"))).toBe(true);
    expect(isDeletedPostError("GONE")).toBe(true);
  });

  it("does not match unrelated failures", () => {
    expect(isDeletedPostError(new FetchError("Blog was banned", 403))).toBe(false);
    expect(isDeletedPostError(new FetchError("post not found", 404))).toBe(false);
    expect(isDeletedPostError(new FetchError("HTTP 500", 500))).toBe(false);
    expect(isDeletedPostError(null)).toBe(false);
  });
});
