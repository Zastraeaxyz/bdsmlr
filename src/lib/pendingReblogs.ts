import { PostVariant, type Post } from "./api";

export interface PendingReblog {
  actorBlogId: number;
  actorBlogName: string;
  postId: number;
  rebloggedAt: number;
  post: Post;
}

const STORAGE_KEY = "bdsmlr:pendingReblogs";
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 20;

function read(): PendingReblog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingReblog[]) : [];
  } catch {
    return [];
  }
}

function write(entries: PendingReblog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage can be full or disabled. Pending cards are cosmetic.
  }
}

function live(entries: PendingReblog[]): PendingReblog[] {
  const now = Date.now();
  return entries.filter((entry) => now - entry.rebloggedAt < TTL_MS);
}

export function addPendingReblog(
  actorBlogId: number,
  actorBlogName: string,
  postId: number,
  post: Post,
): void {
  if (!actorBlogId || !postId) return;
  const entries = live(read()).filter(
    (entry) =>
      entry.postId !== postId &&
      !(
        entry.actorBlogId === actorBlogId &&
        (entry.post.originPostId ?? entry.post.id) === (post.originPostId ?? post.id)
      ),
  );
  entries.unshift({
    actorBlogId,
    actorBlogName,
    postId,
    rebloggedAt: Date.now(),
    post,
  });
  write(entries);
}

export function prunePendingReblogs(realPosts: Post[]): void {
  if (typeof window === "undefined") return;
  const ids = new Set(realPosts.map((post) => post.id));
  const entries = live(read()).filter((entry) => !ids.has(entry.postId));
  write(entries);
}

export function pendingReblogsFor(actorBlogId: number): Post[] {
  if (!actorBlogId || typeof window === "undefined") return [];
  const entries = live(read()).filter((entry) => entry.actorBlogId === actorBlogId);
  if (entries.length === 0) return [];
  write(live(read()));
  return entries.map((entry) => {
    const source = entry.post;
    return {
      ...source,
      id: entry.postId,
      blogId: entry.actorBlogId,
      blogName: entry.actorBlogName,
      variant: PostVariant.Reblog,
      originBlogId: source.originBlogId ?? source.blogId,
      originBlogName: source.originBlogName ?? source.blogName,
      originPostId: source.originPostId ?? source.id,
      createdAtUnix: Math.floor(entry.rebloggedAt / 1000),
      likesCount: 0,
      commentsCount: 0,
      reblogsCount: 0,
    };
  });
}
