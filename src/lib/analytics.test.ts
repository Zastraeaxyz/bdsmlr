import { describe, expect, it } from "vitest";
import {
  countBucket,
  pageviewPath,
  sanitizeEventProps,
  surfaceForPath,
  textLengthBucket,
} from "./analytics";

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

describe("sanitizeEventProps", () => {
  it("keeps only props allowed for the event", () => {
    const props = sanitizeEventProps("like", {
      surface: "following",
      postType: "Image",
      action: "like",
      secret: "should not appear",
    });
    expect(props).toEqual({
      surface: "following",
      postType: "Image",
      action: "like",
    });
  });

  it("drops free text that is not an allowed prop", () => {
    const props = sanitizeEventProps("comment-submit", {
      surface: "post",
      length: "short",
      text: "a private comment",
    });
    expect(props).toEqual({ surface: "post", length: "short" });
  });

  it("normalizes booleans, numbers, and unsafe strings", () => {
    expect(
      sanitizeEventProps("reblog", {
        hasNote: true,
        tagCount: 2.9,
        mode: "queue",
      }),
    ).toEqual({ mode: "queue", hasNote: "true", tagCount: 2 });

    expect(
      sanitizeEventProps("like", {
        action: "  like\u0000  ",
      }),
    ).toEqual({ action: "like" });
  });

  it("returns an empty object for events without props", () => {
    expect(sanitizeEventProps("age-gate-accept")).toEqual({});
    expect(
      sanitizeEventProps("age-gate-accept", {
        surface: "landing",
      }),
    ).toEqual({});
  });
});

describe("surfaceForPath", () => {
  it("maps coarse surfaces", () => {
    expect(surfaceForPath("/")).toBe("landing");
    expect(surfaceForPath("/home")).toBe("following");
    expect(surfaceForPath("/for-you")).toBe("for-you");
    expect(surfaceForPath("/liked")).toBe("liked");
    expect(surfaceForPath("/activity")).toBe("activity");
    expect(surfaceForPath("/blog-search")).toBe("blog-search");
    expect(surfaceForPath("/post/123")).toBe("post");
    expect(surfaceForPath("/dodenial/post/123")).toBe("post");
    expect(surfaceForPath("/dodenial")).toBe("profile");
    expect(surfaceForPath("/dodenial/archive")).toBe("profile");
  });
});

describe("buckets", () => {
  it("buckets counts", () => {
    expect(countBucket(0)).toBe("0");
    expect(countBucket(1)).toBe("1-5");
    expect(countBucket(5)).toBe("1-5");
    expect(countBucket(6)).toBe("6-10");
    expect(countBucket(11)).toBe("11-20");
    expect(countBucket(21)).toBe("20+");
  });

  it("buckets text length", () => {
    expect(textLengthBucket(0)).toBe("short");
    expect(textLengthBucket(139)).toBe("short");
    expect(textLengthBucket(140)).toBe("medium");
    expect(textLengthBucket(499)).toBe("medium");
    expect(textLengthBucket(500)).toBe("long");
  });
});
