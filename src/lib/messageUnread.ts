import { createSignal } from "solid-js";
import { getMessageBootstrap, type MessageThreadSummary } from "./messages";

const [unreadCount, setUnreadCount] = createSignal(0);
let inflight: Promise<void> | null = null;
let lastAttempt = 0;

/** Navigating between pages remounts the header, so keep refreshes apart. */
const MIN_REFRESH_MS = 60_000;

export { unreadCount };

export function setUnreadFromThreads(threads: MessageThreadSummary[]): void {
  setUnreadCount(threads.filter((thread) => thread.unread).length);
}

export function refreshMessageUnread(force = false): Promise<void> {
  if (inflight) return inflight;
  const now = Date.now();
  if (!force && now - lastAttempt < MIN_REFRESH_MS) return Promise.resolve();
  lastAttempt = now;
  inflight = getMessageBootstrap()
    .then((data) => setUnreadFromThreads(data.threads ?? []))
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
