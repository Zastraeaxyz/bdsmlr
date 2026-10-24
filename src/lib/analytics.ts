import {
  PROFILE_TABS,
  RESERVED_TOP_LEVEL,
  TRACKED_STATIC_PAGES,
} from "./appRoutes";

const PROFILE_NAME = /^[A-Za-z0-9_-]+$/;

type Pageview = { path: string; title: string };

type UmamiProps = Record<string, unknown>;

type UmamiTracker = {
  track: (
    payload:
      | Record<string, unknown>
      | ((props: UmamiProps) => Record<string, unknown>),
  ) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

let lastPath: string | null = null;
let queue: Pageview[] = [];
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

function send(entry: Pageview): boolean {
  if (typeof window === "undefined" || !window.umami?.track) return false;
  const url = `${window.location.origin}${entry.path}`;
  window.umami.track((props) => ({
    ...props,
    url,
    title: entry.title,
  }));
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

export function trackPageview(pathname: string): void {
  const path = pageviewPath(pathname);
  if (!path) {
    lastPath = null;
    return;
  }
  if (path === lastPath) return;
  lastPath = path;

  const entry = { path, title: currentTitle() };
  if (send(entry)) return;
  queue.push(entry);
  scheduleFlush();
}
