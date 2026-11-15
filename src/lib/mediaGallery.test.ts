import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { PostType, type Post } from "~/lib/api";
import { createMediaGallery, buildGalleryGroups } from "~/lib/mediaGallery";
import { GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES } from "~/lib/mediaFixtures";
import { imageIdentity } from "~/lib/repeatingImages";

const PROXY = "https://media.bdsmlr.com/feed/s3://ocdn012.bdsmlr.com";

function imagePost(
  id: number,
  mediaUrls: string[],
  html?: string,
  type: number = PostType.Image,
): Post {
  return {
    id,
    blogName: `blog${id}`,
    type,
    content: html ? { html } : undefined,
    mediaRepresentation: {
      items: mediaUrls.map((url) => ({
        original: { url, mimeType: "image/jpeg" },
        alternates: [],
      })),
    },
  };
}

describe("buildGalleryGroups", () => {
  it("keeps card order and upgrades proxied image URLs", () => {
    const post = imagePost(
      10,
      [`${PROXY}/media.jpg?e=2`],
      `<p>caption</p><img src="${PROXY}/inline.jpg?e=1" />`,
    );

    const groups = buildGalleryGroups([post]);

    expect(groups).toHaveLength(1);
    expect(groups[0].postId).toBe(10);
    expect(groups[0].items.map((item) => item.url)).toEqual([
      "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/inline.jpg?e=1",
      "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/media.jpg?e=2",
    ]);
  });

  it("only uses inline media for text posts", () => {
    const post = imagePost(
      11,
      [`${PROXY}/media.jpg`],
      `<img src="${PROXY}/inline.jpg" />`,
      PostType.Text,
    );

    const groups = buildGalleryGroups([post]);

    expect(groups[0].items.map((item) => item.url)).toEqual([
      "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/inline.jpg",
    ]);
  });

  it("respects hidden repeating images in the body and media list", () => {
    const common = `${PROXY}/common.jpg`;
    const unique = `${PROXY}/unique.jpg`;
    const post = imagePost(
      12,
      [common, unique],
      `<p>body</p><img src="${common}" />`,
    );

    const groups = buildGalleryGroups(
      [post],
      new Set([imageIdentity(common)]),
    );

    expect(groups[0].items.map((item) => item.url)).toEqual([
      "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/unique.jpg",
    ]);
  });

  it("keeps fallbacks for a GIF whose MP4 alternate is dead", () => {
    const groups = buildGalleryGroups([GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES]);
    const item = groups[0].items[0];

    expect(item.type).toBe("video");
    expect(item.url).toContain(".mp4");
    expect(item.fallbacks).toHaveLength(1);
    expect(item.fallbacks[0].type).toBe("image");
    expect(item.fallbacks[0].url).toContain(".gif");
  });

  it("keeps inline images and videos as separate items", () => {
    const post = imagePost(
      13,
      [],
      `<img src="${PROXY}/inline.jpg" /><video src="https://ocdn012.bdsmlr.com/clip.mp4"></video>`,
    );

    const groups = buildGalleryGroups([post]);

    expect(groups[0].items.map((item) => item.type)).toEqual([
      "image",
      "video",
    ]);
    expect(groups[0].items[1].url).toBe(
      "https://ocdn012.bdsmlr.com/clip.mp4",
    );
  });
});

describe("createMediaGallery", () => {
  const first = imagePost(1, [`${PROXY}/one.jpg`, `${PROXY}/two.jpg`]);
  const textOnly = imagePost(2, [], "<p>no media</p>", PostType.Text);
  const third = imagePost(3, [`${PROXY}/three.jpg`]);

  it("opens the clicked item and clamps within the post", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({
        posts: () => [first, textOnly, third],
      });

      gallery.open(`${PROXY}/two.jpg`, 1);
      expect(gallery.isOpen()).toBe(true);
      expect(gallery.itemCount()).toBe(2);
      expect(gallery.item()?.url).toBe(
        "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/two.jpg",
      );

      gallery.nextItem();
      expect(gallery.item()?.url).toContain("two.jpg");
      gallery.prevItem();
      gallery.prevItem();
      expect(gallery.item()?.url).toContain("one.jpg");

      dispose();
    });
  });

  it("moves between posts and skips posts without media", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({
        posts: () => [first, textOnly, third],
      });

      gallery.open(`${PROXY}/one.jpg`, 1);
      gallery.nextItem();
      gallery.nextGroup();

      expect(gallery.groupCount()).toBe(2);
      expect(gallery.groupIndex()).toBe(1);
      expect(gallery.item()?.url).toContain("three.jpg");

      gallery.nextGroup();
      expect(gallery.item()?.url).toContain("three.jpg");

      gallery.prevGroup();
      expect(gallery.groupIndex()).toBe(0);
      expect(gallery.item()?.url).toContain("one.jpg");

      dispose();
    });
  });

  it("starts on a fallback candidate when that is what was clicked", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({
        posts: () => [GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES],
      });
      const post = GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES;
      const fallback =
        post.mediaRepresentation!.items![0].original!.url!;

      gallery.open(fallback, post.id);

      expect(gallery.item()?.type).toBe("image");
      expect(gallery.item()?.url).toBe(fallback);
      expect(gallery.item()?.fallbacks[0].url).toContain(".mp4");

      dispose();
    });
  });

  it("keeps the clicked extension when the signed URL changed", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({
        posts: () => [GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES],
      });
      const post = GIF_ORIGINAL_WITH_DEAD_MP4_ALTERNATES;
      const fallback =
        post.mediaRepresentation!.items![0].original!.url!;
      const clicked = fallback
        .replace("https://ocdn012.bdsmlr.com/", "https://media.bdsmlr.com/feed/s3://ocdn012.bdsmlr.com/")
        .replace("e=3", "e=4");

      gallery.open(clicked, post.id);

      expect(gallery.item()?.type).toBe("image");
      expect(gallery.item()?.url).toBe(fallback);
      expect(gallery.item()?.fallbacks[0].url).toContain(".mp4");

      dispose();
    });
  });

  it("opens a standalone item when the feed has no posts", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({ posts: () => [] });

      gallery.open(`${PROXY}/solo.jpg`, 9);

      expect(gallery.isOpen()).toBe(true);
      expect(gallery.item()?.url).toContain("solo.jpg");

      gallery.close();
      expect(gallery.isOpen()).toBe(false);

      dispose();
    });
  });

  it("inserts the clicked URL when it is not in the post group", () => {
    createRoot((dispose) => {
      const gallery = createMediaGallery({ posts: () => [first] });
      const extra = `${PROXY}/extra.jpg`;

      gallery.open(extra, 1);

      expect(gallery.itemIndex()).toBe(0);
      expect(gallery.item()?.url).toBe(
        "https://media.bdsmlr.com/lightbox/s3://ocdn012.bdsmlr.com/extra.jpg",
      );

      dispose();
    });
  });
});
