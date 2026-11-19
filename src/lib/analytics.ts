import {
  PROFILE_TABS,
  RESERVED_TOP_LEVEL,
  TRACKED_STATIC_PAGES,
} from "./appRoutes";

const PROFILE_NAME = /^[A-Za-z0-9_-]+$/;

type Pageview = { path: string; title: string };

type UmamiProps = Record<string, unknown>;

type UmamiTracker = {
  track: {
    (
      payload:
        | Record<string, unknown>
        | ((props: UmamiProps) => Record<string, unknown>),
    ): void;
    (eventName: string, data?: Record<string, unknown>): void;
  };
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export const ANALYTICS_EVENTS = {
  "age-gate-accept": [],
  "age-gate-leave": [],
  login: ["result"],
  "cta-click": ["target", "location"],
  search: ["surface", "mode"],
  "search-results": ["surface", "count"],
  "sort-change": ["surface", "sort"],
  "view-change": ["surface", "view"],
  "post-view": ["postType", "reblog"],
  "post-open": ["surface", "postType"],
  "media-open": ["surface", "mediaType"],
  like: ["surface", "postType", "action"],
  reblog: ["surface", "postType", "mode", "hasNote", "tagCount"],
  "comments-open": ["surface", "postType"],
  "comment-submit": ["surface", "length"],
  follow: ["action"],
  block: ["action"],
  report: ["target"],
  "message-send": ["mode"],
  "message-image": [],
  "conversation-action": ["action"],
  "invitation-connect": ["mode"],
  "invitation-send": [],
  "invitation-action": ["action"],
  "compose-submit": ["postType", "mode", "tagCount", "mediaCount"],
  "compose-failure": ["postType", "mode", "reason"],
  "post-edit": ["postType", "scope", "tagCount"],
  "post-edit-failure": ["postType", "mode", "reason"],
  "draft-action": ["action"],
  "queue-action": ["action"],
  "settings-save": ["field"],
  "engagement-open": ["kind"],
  "profile-tab": ["tab"],
  "activity-filter": ["filter"],
  "rss-open": [],
  "outbound-bdsmlr": ["surface"],
  "tag-click": ["surface"],
  "load-more": ["surface"],
} as const;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

type PropValue = string | number | boolean;

export type AnalyticsProps<T extends AnalyticsEvent> = Partial<
  Record<(typeof ANALYTICS_EVENTS)[T][number], PropValue>
>;

type Queued =
  | { kind: "pageview"; path: string; title: string }
  | { kind: "event"; name: string; data: Record<string, string | number> };

const QUEUE_LIMIT = 50;
const MAX_STRING_LENGTH = 64;
const MAX_PROPS = 8;

let lastPath: string | null = null;
let queue: Queued[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushAttempts = 0;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function currentTitle(): string {
  return typeof document === "undefined" ? "" : document.title;
}

export function pageviewPath(pathname: string): string | null {
  let path = pathname;
  const queryAt = path.indexOf("?");
  if (queryAt !== -1) path = path.slice(0, queryAt);
  const hashAt = path.indexOf("#");
  if (hashAt !== -1) path = path.slice(0, hashAt);
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "");
  if (!path) return "/";

  if (TRACKED_STATIC_PAGES.has(path)) return path;

  const parts = path
    .split("/")
    .filter(Boolean)
    .map(safeDecode);

  if (parts.length === 0) return "/";

  if (parts[0].toLowerCase() === "post") return null;
  if (parts.length >= 2 && parts[1].toLowerCase() === "post") return null;

  const profileName = parts[0];
  const reserved = RESERVED_TOP_LEVEL.has(profileName.toLowerCase());

  if (parts.length === 1) {
    if (reserved || !PROFILE_NAME.test(profileName)) return null;
    return `/${encodeURIComponent(profileName)}`;
  }

  if (parts.length === 2) {
    if (reserved || !PROFILE_NAME.test(profileName)) return null;
    if (!PROFILE_TABS.has(parts[1].toLowerCase())) return null;
    return `/${encodeURIComponent(profileName)}`;
  }

  return null;
}

export function surfaceForPath(pathname: string): string {
  if (pathname === "/") return "landing";
  if (pathname === "/home") return "following";
  if (pathname === "/for-you") return "for-you";
  if (pathname === "/liked") return "liked";
  if (pathname === "/activity") return "activity";
  if (pathname === "/blog-search") return "blog-search";
  if (pathname === "/post" || /\/post(\/|$)/.test(pathname)) return "post";
  return "profile";
}

export function countBucket(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value <= 5) return "1-5";
  if (value <= 10) return "6-10";
  if (value <= 20) return "11-20";
  return "20+";
}

export function textLengthBucket(value: number): string {
  if (value < 140) return "short";
  if (value < 500) return "medium";
  return "long";
}

export function sanitizeEventProps<T extends AnalyticsEvent>(
  name: T,
  props?: Record<string, PropValue | null | undefined>,
): Record<string, string | number> {
  const allowed = ANALYTICS_EVENTS[name] as readonly string[];
  const result: Record<string, string | number> = {};
  if (!props) return result;

  let count = 0;
  for (const key of allowed) {
    if (count >= MAX_PROPS) break;
    const value = props[key];
    if (value === undefined || value === null) continue;

    if (typeof value === "boolean") {
      result[key] = value ? "true" : "false";
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      result[key] = Math.trunc(value);
    } else if (typeof value === "string") {
      const cleaned = value
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, MAX_STRING_LENGTH);
      if (!cleaned) continue;
      result[key] = cleaned;
    } else {
      continue;
    }
    count += 1;
  }

  return result;
}

function send(entry: Queued): boolean {
  if (typeof window === "undefined" || !window.umami?.track) return false;
  if (entry.kind === "pageview") {
    const url = `${window.location.origin}${entry.path}`;
    window.umami.track((props) => ({
      ...props,
      url,
      title: entry.title,
    }));
    return true;
  }
  window.umami.track(entry.name, entry.data);
  return true;
}

function flushQueue(): boolean {
  if (typeof window === "undefined" || !window.umami?.track) return false;
  const pending = queue;
  queue = [];
  for (let i = 0; i < pending.length; i += 1) {
    if (!send(pending[i])) {
      queue = pending.slice(i);
      return false;
    }
  }
  return true;
}

function scheduleFlush(): void {
  if (typeof window === "undefined" || flushTimer) return;
  flushAttempts = 0;
  const tick = () => {
    flushTimer = null;
    if (flushQueue()) return;
    flushAttempts += 1;
    if (flushAttempts >= 20) return;
    flushTimer = setTimeout(tick, 500);
  };
  tick();
}

function enqueue(entry: Queued): void {
  if (queue.length >= QUEUE_LIMIT) queue.shift();
  queue.push(entry);
  scheduleFlush();
}

export function trackPageview(pathname: string): void {
  const path = pageviewPath(pathname);
  if (!path) {
    lastPath = null;
    return;
  }
  if (path === lastPath) return;
  lastPath = path;

  const entry: Queued = { kind: "pageview", path, title: currentTitle() };
  if (send(entry)) return;
  enqueue(entry);
}

export function trackEvent<T extends AnalyticsEvent>(
  name: T,
  props?: AnalyticsProps<T>,
): void {
  if (typeof window === "undefined") return;
  const data = sanitizeEventProps(
    name,
    props as Record<string, PropValue | null | undefined> | undefined,
  );
  const entry: Queued = { kind: "event", name, data };
  if (send(entry)) return;
  enqueue(entry);
}
