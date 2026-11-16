import { describe, expect, it } from "vitest";
import { isPrivateBlogError } from "./blogErrors";

describe("isPrivateBlogError", () => {
  it("matches the routing error BDSMLR returns for a private blog", () => {
    expect(
      isPrivateBlogError(
        "Cannot find any route matching [POST] https://bdsmlr.zastraea.xyz/v2/api/list-blog-activity",
      ),
    ).toBe(true);
  });

  it("matches regardless of casing", () => {
    expect(
      isPrivateBlogError(
        "cannot find any route matching [post] https://example.com/v2/api/list-blog-activity",
      ),
    ).toBe(true);
  });

  it("does not match other errors", () => {
    expect(isPrivateBlogError("Blog was banned")).toBe(false);
    expect(isPrivateBlogError("HTTP 500")).toBe(false);
    expect(isPrivateBlogError("")).toBe(false);
    expect(isPrivateBlogError(null)).toBe(false);
    expect(isPrivateBlogError(undefined)).toBe(false);
  });

  it("does not match routing errors for other endpoints", () => {
    expect(
      isPrivateBlogError(
        "Cannot find any route matching [POST] https://example.com/v2/api/search-posts-by-tag",
      ),
    ).toBe(false);
  });
});
