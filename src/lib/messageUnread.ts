import { createSignal } from "solid-js";
import { getMessageBootstrap, type MessageThreadSummary } from "./messages";

const [unreadCount, setUnreadCount] = createSignal(0);
let inflight: Promise<void> | null = null;

export { unreadCount };

export function setUnreadFromThreads(threads: MessageThreadSummary[]): void {
  setUnreadCount(threads.filter((thread) => thread.unread).length);
}

export function refreshMessageUnread(): Promise<void> {
  if (inflight) return inflight;
  inflight = getMessageBootstrap()
    .then((data) => setUnreadFromThreads(data.threads ?? []))
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
