import type { MediaRepresentation } from "~/lib/api";

export type MediaType = "image" | "video";

export function getMediaType(url: string): MediaType {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (!ext) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) return "video";
  return "image";
}

const VALID_SIZES = new Set([
  "feed",
  "lightbox",
  "masonry",
  "raw",
  "gallery-grid",
]);
const RAWS = new Set(["gif", "mp4", "webm", "ogg", "mov", "avi"]);

function extname(url: string): string | undefined {
  return url.split("?")[0].split(".").pop()?.toLowerCase();
}

function isRaw(ext: string | undefined): ext is string {
  return ext ? RAWS.has(ext) : false;
}

function ensureValid(size: string): string {
  return VALID_SIZES.has(size) ? size : "feed";
}

const CDN_RE = /^https:\/\/(ocdn|cdn)(\d+)\.bdsmlr\.com\/(.+)/;
const MEDIA_RE =
  /^https:\/\/media\.bdsmlr\.com\/([^/]+)\/s3:\/\/(ocdn|cdn)(\d+)\.bdsmlr\.com\/(.+)/;

export function transformMediaUrl(url: string, size: string = "feed"): string {
  size = ensureValid(size);

  const m = url.match(CDN_RE);
  if (m) {
    const ext = extname(m[3]);
    const s = isRaw(ext) ? "raw" : size;
    return `https://media.bdsmlr.com/${s}/s3://ocdn${m[2]}.bdsmlr.com/${m[3]}`;
  }

  const m2 = url.match(MEDIA_RE);
  if (m2) {
    const ext = extname(m2[4]);
    if (isRaw(ext)) {
      return `https://media.bdsmlr.com/raw/s3://ocdn${m2[3]}.bdsmlr.com/${m2[4]}`;
    }
  }

  return url;
}

export function unwrapMediaUrl(url: string): string {
  const m = url.match(MEDIA_RE);
  if (m) return `https://${m[2]}${m[3]}.bdsmlr.com/${m[4]}`;
  return url;
}

export function upgradeToLightbox(url: string): string {
  return url.replace(
    /https:\/\/media\.bdsmlr\.com\/(feed|masonry)\//,
    "https://media.bdsmlr.com/lightbox/",
  );
}

export function sanitizeHtml(html: string): string {
  const cleaned = html.replace(/<[a-z][a-z0-9]*\b[^>]*>/gi, (tag) => {
    if (/^<p\b/i.test(tag)) return "<p>";
    return tag.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, "");
  });
  // Skip empty paragraph content (e.g. <p><br></p>)
  if (/^\s*<p>\s*<br\b[^>]*>\s*<\/p>\s*$/i.test(cleaned)) return "";
  return cleaned;
}

const STATIC_IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "bmp",
  "svg",
  "ico",
  "tif",
  "tiff",
  "avif",
]);

function pickItemUrl(item: {
  original?: { url?: string; mimeType?: string | null };
  alternates?: { url?: string; mimeType?: string | null }[];
}): string | undefined {
  const originalUrl = item.original?.url;
  const alternateUrl = item.alternates?.find((a) => a.url && a.mimeType)?.url;

  if (originalUrl && item.original?.mimeType) return originalUrl;

  if (originalUrl) {
    const ext = extname(originalUrl);
    if (ext && STATIC_IMAGE_EXTS.has(ext)) return originalUrl;
    if (alternateUrl) return alternateUrl;
    return originalUrl;
  }

  return alternateUrl;
}

export interface PostMediaCandidate {
  url: string
  type: MediaType
}

export interface PostMediaItem extends PostMediaCandidate {
  fallbacks: PostMediaCandidate[]
}

function candidate(
  url: string | undefined,
  mimeType?: string | null,
): PostMediaCandidate | null {
  if (!url) return null
  let type = getMediaType(url)
  if (mimeType?.startsWith('video/')) type = 'video'
  else if (mimeType?.startsWith('image/')) type = 'image'
  return { url, type }
}

export function getPostMediaItems(post: { mediaRepresentation?: MediaRepresentation }): PostMediaItem[] {
  const items = post.mediaRepresentation?.items
  if (!items || items.length === 0) return []

  const result: PostMediaItem[] = []
  for (const item of items) {
    const primaryUrl = pickItemUrl(item)
    const original = candidate(item.original?.url, item.original?.mimeType)
    const alternates = (item.alternates ?? [])
      .map((alt) => candidate(alt.url, alt.mimeType))
      .filter((alt): alt is PostMediaCandidate => !!alt)
    const primary =
      [original, ...alternates].find((entry) => entry?.url === primaryUrl) ??
      candidate(primaryUrl)
    if (!primary) continue

    const seen = new Set([primary.url])
    const fallbacks: PostMediaCandidate[] = []
    for (const entry of [original, ...alternates]) {
      if (!entry || seen.has(entry.url)) continue
      seen.add(entry.url)
      fallbacks.push(entry)
    }
    result.push({ ...primary, fallbacks })
  }

  return result
}

export function getPostMediaUrls(post: { mediaRepresentation?: MediaRepresentation }): string[] {
  return getPostMediaItems(post).map((item) => item.url)
}

export function processContentHtml(
  html: string,
  urls?: string[],
): string {
  if (!urls || urls.length === 0) return html;

  const fileMap = new Map<string, string>();
  for (const url of urls) {
    const filename = url.split("/").pop()?.split("?")[0];
    if (filename) fileMap.set(filename, url);
  }

  return html.replace(
    /<img\b[^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi,
    (_, src) => {
      const cdnFilename = src.split("/").pop()?.split("?")[0];
      const url = (cdnFilename && fileMap.get(cdnFilename)) || src;

      const type = getMediaType(url);
      if (type === "video") {
        return `<video src="${url}" muted controls preload="metadata"></video>`;
      }
      return `<img src="${url}" alt="" />`;
    },
  );
}
