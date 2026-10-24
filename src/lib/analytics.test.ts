import { describe, expect, it } from "vitest";
import { pageviewPath } from "./analytics";

const STATIC_PAGES = [
  "/",
  "/about",
  "/blocked",
  "/blog-search",
  "/compose",
  "/customize",
  "/drafts",
  "/for-you",
  "/home",
  "/liked",
  "/login",
  "/messages",
  "/settings",
];

describe("pageviewPath", () => {
  it("tracks every real static page", () => {
    for (const path of STATIC_PAGES) {
      expect(pageviewPath(path)).toBe(path);
    }
  });

  it("tracks the landing and home pages without query strings or hashes", () => {
    expect(pageviewPath("/")).toBe("/");
    expect(pageviewPath("/?utm=x")).toBe("/");
    expect(pageviewPath("/home?tag_name=chastity&page=3")).toBe("/home");
    expect(pageviewPath("/home#features")).toBe("/home");
    expect(pageviewPath("/home/")).toBe("/home");
  });

  it("tracks profiles at the profile root", () => {
    expect(pageviewPath("/dodenial")).toBe("/dodenial");
    expect(pageviewPath("/dodenial/")).toBe("/dodenial");
    expect(pageviewPath("/cuckoldHDwallpapers")).toBe("/cuckoldHDwallpapers");
    expect(pageviewPath("/foo%2Dbar")).toBe("/foo-bar");
  });

  it("aggregates every profile tab into the profile root", () => {
    for (const tab of [
      "activity",
      "archive",
      "follower-feed",
      "followers",
      "following",
      "siblings",
    ]) {
      expect(pageviewPath(`/dodenial/${tab}`)).toBe("/dodenial");
    }
  });

  it("drops post detail paths", () => {
    expect(
      pageviewPath(
        "/post/14058339146bfb30dcdcf2e57fcbff6404eb803ffe3a2f12d42d50c4fe62610e",
      ),
    ).toBeNull();
    expect(pageviewPath("/post/29380365")).toBeNull();
    expect(pageviewPath("/DerangedPiglet/post/29380365")).toBeNull();
    expect(pageviewPath("/DerangedPiglet/post/872055879/extra")).toBeNull();
  });

  it("drops redirect-only and non-page routes", () => {
    expect(pageviewPath("/search")).toBeNull();
    expect(pageviewPath("/search?q=test")).toBeNull();
    expect(pageviewPath("/following")).toBeNull();
    expect(pageviewPath("/activity")).toBeNull();
    expect(pageviewPath("/dodenial/rss")).toBeNull();
    expect(pageviewPath("/api/messages/bootstrap")).toBeNull();
    expect(pageviewPath("/v2/api/post")).toBeNull();
    expect(pageviewPath("/blog/dodenial")).toBeNull();
    expect(pageviewPath("/does/not/exist")).toBeNull();
  });

  it("does not treat reserved top-level names as profiles", () => {
    expect(pageviewPath("/compose")).toBe("/compose");
    expect(pageviewPath("/settings")).toBe("/settings");
    expect(pageviewPath("/previews")).toBeNull();
    expect(pageviewPath("/assets")).toBeNull();
    expect(pageviewPath("/post")).toBeNull();
  });
});
