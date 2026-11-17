import { describe, expect, it } from "vitest";
import { classifyRoute, isProxyAllowedForGuests } from "./routeGate";

describe("classifyRoute", () => {
  it("treats static files and build output as assets", () => {
    expect(classifyRoute("/_build/assets/index.js")).toBe("asset");
    expect(classifyRoute("/assets/logo.svg")).toBe("asset");
    expect(classifyRoute("/favicon.ico")).toBe("asset");
    expect(classifyRoute("/previews/hero-account.png")).toBe("asset");
  });

  it("keeps marketing and auth pages public", () => {
    expect(classifyRoute("/")).toBe("public");
    expect(classifyRoute("/login")).toBe("public");
    expect(classifyRoute("/about")).toBe("public");
    expect(classifyRoute("/changelog")).toBe("public");
  });

  it("allows profile headers but not their tabs", () => {
    expect(classifyRoute("/someone")).toBe("profile");
    expect(classifyRoute("/someone/")).toBe("profile");
    expect(classifyRoute("/Someone")).toBe("profile");
    expect(classifyRoute("/someone/following")).toBe("gated");
    expect(classifyRoute("/someone/follower-feed")).toBe("gated");
    expect(classifyRoute("/someone/archive")).toBe("gated");
    expect(classifyRoute("/someone/unknown-thing")).toBe("gated");
  });

  it("keeps single post links readable", () => {
    expect(classifyRoute("/post/123")).toBe("post");
    expect(classifyRoute("/post")).toBe("post");
    expect(classifyRoute("/someone/post/123")).toBe("post");
  });

  it("keeps RSS feeds public", () => {
    expect(classifyRoute("/someone/rss")).toBe("public");
  });

  it("gates the signed-in app pages", () => {
    for (const path of [
      "/home",
      "/search",
      "/tag/cats",
      "/messages",
      "/activity",
      "/for-you",
      "/customize",
      "/queue",
      "/drafts",
      "/settings",
      "/blocked",
      "/liked",
      "/blog-search",
      "/compose",
      "/following",
    ]) {
      expect(classifyRoute(path), path).toBe("gated");
    }
  });

  it("marks API routes so they 401 instead of redirecting", () => {
    expect(classifyRoute("/v2/api/list-blog-activity")).toBe("api");
    expect(classifyRoute("/api/web-login")).toBe("api");
  });

  it("treats a reserved-looking unknown path as gated", () => {
    expect(classifyRoute("/post-ish")).toBe("profile");
    expect(classifyRoute("/tag")).toBe("gated");
  });
});

describe("isProxyAllowedForGuests", () => {
  it("allows the login call and public lookups", () => {
    expect(isProxyAllowedForGuests("/v2/api/auth/login")).toBe(true);
    expect(isProxyAllowedForGuests("/v2/api/get-blog")).toBe(true);
    expect(isProxyAllowedForGuests("/v2/api/get-post-detail")).toBe(true);
    expect(isProxyAllowedForGuests("/v2/api/resolve-identifier")).toBe(true);
  });

  it("blocks everything else", () => {
    expect(isProxyAllowedForGuests("/v2/api/list-blog-activity")).toBe(false);
    expect(isProxyAllowedForGuests("/v2/api/search-posts-by-tag")).toBe(false);
    expect(isProxyAllowedForGuests("/v2/api/list-post-comments")).toBe(false);
    expect(isProxyAllowedForGuests("/v2/api/auth/logout")).toBe(false);
  });
});
