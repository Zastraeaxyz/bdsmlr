import { createSignal } from "solid-js";
import { PostType, type Post } from "~/lib/api";
import {
  getMediaType,
  getPostMediaItems,
  getPostMediaUrls,
  processContentHtml,
  sanitizeHtml,
  unwrapMediaUrl,
  upgradeToLightbox,
  type MediaType,
  type PostMediaCandidate,
  type PostMediaItem,
} from "~/lib/sanitize";
import {
  filterRepeatingMediaItems,
  imageIdentity,
  stripRepeatingImagesFromHtml,
} from "~/lib/repeatingImages";

const EMPTY_HIDDEN_IMAGES: ReadonlySet<string> = new Set();

const CONTENT_MEDIA_RE =
  /<(img|video)\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

export interface GalleryItem extends PostMediaCandidate {
  /** Other representations of the same item, tried when the primary fails. */
  fallbacks: PostMediaCandidate[];
}

export interface GalleryGroup {
  postId: number | null;
  blogName?: string;
  items: GalleryItem[];
}

function decodeAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&#x0*27;/gi, "'");
}

function upgradeCandidate(candidate: PostMediaCandidate): PostMediaCandidate {
  return {
    url:
      candidate.type === "image"
        ? upgradeToLightbox(candidate.url)
        : candidate.url,
    type: candidate.type,
  };
}

function toGalleryItem(item: PostMediaItem): GalleryItem {
  const primary = upgradeCandidate(item);
  return {
    ...primary,
    fallbacks: item.fallbacks.map(upgradeCandidate),
  };
}

function contentGalleryItems(
  post: Post,
  hiddenImageIdentities: ReadonlySet<string>,
): GalleryItem[] {
  const html = post.content?.html;
  if (!html) return [];

  const processed =
    post.type === PostType.Text
      ? processContentHtml(html, getPostMediaUrls(post))
      : html;
  const cleaned = stripRepeatingImagesFromHtml(
    sanitizeHtml(processed),
    hiddenImageIdentities,
  );

  const items: GalleryItem[] = [];
  for (const match of cleaned.matchAll(CONTENT_MEDIA_RE)) {
    const url = decodeAttribute(match[2] ?? match[3] ?? "").trim();
    if (!url) continue;
    const type: MediaType =
      match[1].toLowerCase() === "video" ? "video" : "image";
    items.push({
      url: type === "image" ? upgradeToLightbox(url) : url,
      type,
      fallbacks: [],
    });
  }
  return items;
}

/**
 * Turn the posts currently rendered in a feed into lightbox groups. Each group
 * keeps the order the card shows: inline body media first, then the media list.
 */
export function buildGalleryGroups(
  posts: Post[],
  hiddenImageIdentities: ReadonlySet<string> = EMPTY_HIDDEN_IMAGES,
): GalleryGroup[] {
  const groups: GalleryGroup[] = [];

  for (const post of posts) {
    const items: GalleryItem[] = [];
    const byUrl = new Map<string, GalleryItem>();

    const add = (item: GalleryItem) => {
      if (!item.url) return;
      const existing = byUrl.get(item.url);
      if (existing) {
        const known = new Set(existing.fallbacks.map((entry) => entry.url));
        for (const fallback of item.fallbacks) {
          if (known.has(fallback.url)) continue;
          existing.fallbacks.push(fallback);
          known.add(fallback.url);
        }
        return;
      }
      byUrl.set(item.url, item);
      items.push(item);
    };

    for (const item of contentGalleryItems(post, hiddenImageIdentities)) {
      add(item);
    }

    if (post.type !== PostType.Text) {
      const media = filterRepeatingMediaItems(
        getPostMediaItems(post),
        hiddenImageIdentities,
      );
      for (const item of media) {
        add(toGalleryItem(item));
      }
    }

    if (items.length === 0) continue;
    groups.push({
      postId: post.id > 0 ? post.id : null,
      blogName: post.blogName,
      items,
    });
  }

  return groups;
}

function makeItem(url: string): GalleryItem {
  const type = getMediaType(url);
  return {
    url: type === "image" ? upgradeToLightbox(url) : url,
    type,
    fallbacks: [],
  };
}

interface ItemMatch {
  itemIndex: number;
  candidateIndex: number;
}

function mediaPath(url: string): string {
  return unwrapMediaUrl(url).split(/[?#]/, 1)[0].toLowerCase();
}

function findItemMatch(group: GalleryGroup, url: string): ItemMatch | null {
  for (let index = 0; index < group.items.length; index += 1) {
    const candidates = [group.items[index], ...group.items[index].fallbacks];
    const exact = candidates.findIndex((candidate) => candidate.url === url);
    if (exact >= 0) return { itemIndex: index, candidateIndex: exact };
  }

  const path = mediaPath(url);
  if (path) {
    for (let index = 0; index < group.items.length; index += 1) {
      const candidates = [group.items[index], ...group.items[index].fallbacks];
      const matched = candidates.findIndex(
        (candidate) => mediaPath(candidate.url) === path,
      );
      if (matched >= 0) return { itemIndex: index, candidateIndex: matched };
    }
  }

  const identity = imageIdentity(url);
  if (!identity) return null;

  for (let index = 0; index < group.items.length; index += 1) {
    const candidates = [group.items[index], ...group.items[index].fallbacks];
    const matched = candidates.findIndex(
      (candidate) => imageIdentity(candidate.url) === identity,
    );
    if (matched >= 0) return { itemIndex: index, candidateIndex: matched };
  }

  return null;
}

function promoteCandidate(group: GalleryGroup, match: ItemMatch): void {
  const item = group.items[match.itemIndex];
  const candidates = [item, ...item.fallbacks];
  const chosen = candidates[match.candidateIndex];
  const fallbacks = candidates
    .filter((_, index) => index !== match.candidateIndex)
    .map((candidate) => ({ url: candidate.url, type: candidate.type }));
  group.items[match.itemIndex] = {
    url: chosen.url,
    type: chosen.type,
    fallbacks,
  };
}

export interface MediaGalleryOptions {
  /** Posts in the order they appear on the page. */
  posts: () => Post[];
  /** Repeating images hidden from the feed, when the feed has that setting. */
  hiddenImageIdentities?: () => ReadonlySet<string>;
}

export interface MediaGallery {
  isOpen: () => boolean;
  group: () => GalleryGroup | null;
  item: () => GalleryItem | null;
  groupIndex: () => number;
  groupCount: () => number;
  itemIndex: () => number;
  itemCount: () => number;
  open: (url: string, postId?: number) => void;
  close: () => void;
  nextItem: () => void;
  prevItem: () => void;
  nextGroup: () => void;
  prevGroup: () => void;
}

export function createMediaGallery(
  options: MediaGalleryOptions,
): MediaGallery {
  const [isOpen, setIsOpen] = createSignal(false);
  const [groups, setGroups] = createSignal<GalleryGroup[]>([]);
  const [groupIndex, setGroupIndex] = createSignal(0);
  const [itemIndex, setItemIndex] = createSignal(0);

  const group = () => groups()[groupIndex()] ?? null;
  const item = () => group()?.items[itemIndex()] ?? null;
  const itemCount = () => group()?.items.length ?? 0;

  const open = (url: string, postId?: number) => {
    const hidden =
      options.hiddenImageIdentities?.() ?? EMPTY_HIDDEN_IMAGES;
    const built = buildGalleryGroups(options.posts(), hidden);
    if (built.length === 0) {
      built.push({
        postId: postId && postId > 0 ? postId : null,
        items: [makeItem(url)],
      });
    }

    let nextGroupIndex = -1;
    if (postId != null && postId > 0) {
      nextGroupIndex = built.findIndex((entry) => entry.postId === postId);
    }
    if (nextGroupIndex < 0) {
      nextGroupIndex = built.findIndex(
        (entry) => findItemMatch(entry, url) !== null,
      );
    }
    if (nextGroupIndex < 0) {
      built.push({
        postId: postId && postId > 0 ? postId : null,
        items: [makeItem(url)],
      });
      nextGroupIndex = built.length - 1;
    }

    const target = built[nextGroupIndex];
    const match = findItemMatch(target, url);
    let nextItemIndex = 0;
    if (match) {
      nextItemIndex = match.itemIndex;
      if (match.candidateIndex > 0) {
        promoteCandidate(target, match);
      }
    } else {
      target.items.unshift(makeItem(url));
    }

    setGroups(built);
    setGroupIndex(nextGroupIndex);
    setItemIndex(nextItemIndex);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const nextItem = () => {
    const count = itemCount();
    if (count === 0) return;
    setItemIndex((index) => Math.min(index + 1, count - 1));
  };

  const prevItem = () => {
    const count = itemCount();
    if (count === 0) return;
    setItemIndex((index) => Math.max(index - 1, 0));
  };

  const nextGroup = () => {
    const count = groups().length;
    if (count === 0) return;
    const next = Math.min(groupIndex() + 1, count - 1);
    if (next === groupIndex()) return;
    setGroupIndex(next);
    setItemIndex(0);
  };

  const prevGroup = () => {
    const count = groups().length;
    if (count === 0) return;
    const previous = Math.max(groupIndex() - 1, 0);
    if (previous === groupIndex()) return;
    setGroupIndex(previous);
    setItemIndex(0);
  };

  return {
    isOpen,
    group,
    item,
    groupIndex,
    groupCount: () => groups().length,
    itemIndex,
    itemCount,
    open,
    close,
    nextItem,
    prevItem,
    nextGroup,
    prevGroup,
  };
}
