import { createSignal } from "solid-js";
import { listBlogActivity, type Post } from "./api";

interface TimelineItem {
  type: number;
  post?: Post;
  cluster?: { label?: string; interactions?: Post[] };
}

const [activityUnreadCount, setActivityUnreadCount] = createSignal(0);
let inflight: Promise<void> | null = null;

export { activityUnreadCount };

function storageKey(blogId: number): string {
  return `bdsmlr:activitySeen:${blogId}`;
}

function itemKey(item: TimelineItem): string | null {
  if (item.type === 1 && item.post) return `post:${item.post.id}`;
  if (item.type === 2 && item.cluster) {
    const ids = (item.cluster.interactions ?? [])
      .slice(0, 3)
      .map((post) => post.id)
      .join("-");
    return `cluster:${item.cluster.label ?? "activity"}:${ids}`;
  }
  return null;
}

function readSeen(blogId: number): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(blogId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSeen(blogId: number, keys: string[]): void {
  try {
    localStorage.setItem(storageKey(blogId), JSON.stringify(keys.slice(0, 60)));
  } catch {}
}

export function markActivitySeen(blogId: number, items: TimelineItem[]): void {
  const keys = items.map(itemKey).filter((key): key is string => !!key);
  writeSeen(blogId, keys);
  setActivityUnreadCount(0);
}

export function refreshActivityUnread(
  blogId: number,
  blogName: string,
): Promise<void> {
  if (inflight) return inflight;
  inflight = listBlogActivity({
    blog_id: blogId,
    blog_name: blogName,
    sort_field: 1,
    order: 2,
    post_types: [1, 2, 3, 4, 5, 6, 7],
    activity_kinds: ["post", "reblog", "like", "comment"],
    page: { page_size: 20 },
    page_size: 20,
  })
    .then((data) => {
      const items = (data.timelineItems ?? []) as TimelineItem[];
      const keys = items.map(itemKey).filter((key): key is string => !!key);
      const seen = readSeen(blogId);
      if (seen === null) {
        writeSeen(blogId, keys);
        setActivityUnreadCount(0);
        return;
      }
      const seenSet = new Set(seen);
      setActivityUnreadCount(keys.filter((key) => !seenSet.has(key)).length);
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearActivityUnread(): void {
  setActivityUnreadCount(0);
}
