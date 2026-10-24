import {
  cachedGetBlog,
  cachedResolveIdentifier,
  fetchPostDetail,
} from "./rssApi";
import { getPostMediaItems } from "./sanitize";

export interface SocialPreview {
  title: string;
  description: string;
  url: string;
  image: string;
  type: "website" | "profile" | "article";
}

const RESERVED_TOP_LEVEL = new Set([
  "about",
  "activity",
  "api",
  "assets",
  "favicon.svg",
  "following",
  "for-you",
  "icons.svg",
  "liked",
  "login",
  "messages",
  "og-default.png",
  "search",
  "tag",
  "v2",
]);

const SOCIAL_BOT =
  /discordbot|twitterbot|facebookexternalhit|slackbot|telegrambot|linkedinbot|pinterest|redditbot|embedly|whatsapp|skypeuripreview|vkshare|applebot|googlebot|bingbot|yandex|bot\b/i;

export function isSocialBot(userAgent: string): boolean {
  return SOCIAL_BOT.test(userAgent);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    });
}

function cleanText(input?: string): string {
  if (!input) return "";
  return decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function absoluteUrl(value: string | undefined, origin: string): string {
  if (!value) return `${origin}/og-default.png`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function canonical(origin: string, path: string): string {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function rootPreview(origin: string): SocialPreview {
  return {
    title: "Better BDSMLR",
    description:
      "A cleaner way to browse BDSMLR. Follow your feed, search posts, and stay connected.",
    url: `${origin}/`,
    image: `${origin}/og-default.png`,
    type: "website",
  };
}

async function profilePreview(
  username: string,
  origin: string,
): Promise<SocialPreview> {
  const fallback: SocialPreview = {
    title: `${username} on Better BDSMLR`,
    description: `Posts and updates from @${username} on BDSMLR.`,
    url: canonical(origin, `/${encodeURIComponent(username)}`),
    image: `${origin}/og-default.png`,
    type: "profile",
  };

  try {
    const resolved = await cachedResolveIdentifier(username);
    if (!resolved.blogId) return fallback;
    const data = await cachedGetBlog(resolved.blogId);
    const blog = data.blog;
    if (!blog) {
      return {
        ...fallback,
        title: `${username} on Better BDSMLR`,
        description: "This BDSMLR blog is private or unavailable.",
      };
    }
    const description = cleanText(blog.description);
    const displayName = blog.title?.trim();
    const title =
      displayName && displayName.toLowerCase() !== blog.name.toLowerCase()
        ? `${displayName} (@${blog.name})`
        : `@${blog.name} on Better BDSMLR`;
    return {
      title,
      description: description
        ? truncate(description, 220)
        : `Posts and updates from @${blog.name} on BDSMLR.`,
      url: canonical(origin, `/${encodeURIComponent(blog.name)}`),
      image: absoluteUrl(blog.avatarUrl || blog.coverUrl, origin),
      type: "profile",
    };
  } catch {
    return fallback;
  }
}

async function postPreview(
  postId: number,
  origin: string,
): Promise<SocialPreview | null> {
  try {
    const data = await fetchPostDetail(postId);
    const post = data.post;
    if (!post) return null;

    const blogName = post.blogName || "BDSMLR";
    const bodyText = cleanText(
      post.title ||
        post.content?.title ||
        post.content?.text ||
        post.body ||
        post.content?.html,
    );
    const tagLine = (post.tags ?? [])
      .slice(0, 4)
      .map((tag) => `#${tag}`)
      .join(" ");
    const isReblog = post.variant === 2 && !!post.originBlogName;
    const customBody = /^originally posted by/i.test(bodyText) ? "" : bodyText;
    const title = post.title
      ? `${blogName}: ${truncate(cleanText(post.title), 80)}`
      : isReblog
        ? `Reblogged by @${blogName}`
        : !bodyText && tagLine
          ? `${blogName}: ${tagLine}`
          : `${blogName} on Better BDSMLR`;
    const media = getPostMediaItems(post).flatMap((item) => [
      item,
      ...item.fallbacks,
    ]);
    const image = media.find((entry) => entry.type === "image")?.url;

    let description: string;
    if (isReblog) {
      description = `Reblogged from @${post.originBlogName}.`;
      if (customBody) description += ` ${truncate(customBody, 140)}`;
      if (tagLine) description += ` ${tagLine}`;
    } else if (bodyText) {
      description = truncate(bodyText, 220);
    } else if (tagLine) {
      description = `A post from @${blogName} on BDSMLR. ${tagLine}`;
    } else {
      description = `A post from @${blogName} on BDSMLR.`;
    }

    return {
      title,
      description,
      url: canonical(
        origin,
        `/${encodeURIComponent(blogName)}/post/${post.id}`,
      ),
      image: absoluteUrl(image, origin),
      type: "article",
    };
  } catch {
    return null;
  }
}

export async function buildSocialPreview(url: URL): Promise<SocialPreview | null> {
  const origin = url.origin;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/") return rootPreview(origin);

  const postMatch = pathname.match(/^\/(?:([^/]+)\/)?post\/(\d+)$/);
  if (postMatch) return postPreview(Number(postMatch[2]), origin);

  const profileMatch = pathname.match(/^\/([A-Za-z0-9_-]+)$/);
  if (profileMatch) {
    const username = profileMatch[1];
    if (!RESERVED_TOP_LEVEL.has(username.toLowerCase())) {
      return profilePreview(username, origin);
    }
  }

  return null;
}
