export interface MessageThreadSummary {
  id: number;
  name: string;
  avatar_url?: string;
  preview?: string;
  last_message_id?: number;
  updated_at?: string;
  unread?: boolean;
  blocked?: boolean;
  archived?: boolean;
}

export interface MessageBootstrapHistoryItem {
  thread_id?: number;
  name?: string;
  body?: string;
}

export interface MessageBootstrap {
  threads?: MessageThreadSummary[];
  history?: MessageBootstrapHistoryItem[];
}

export interface Message {
  id: number;
  body: string;
  media_urls?: string[];
  sent_by_me?: boolean;
  created_at?: string;
}

export interface MessageThread {
  thread: MessageThreadSummary;
  messages?: Message[];
  next_before?: string | null;
}

export class MessagesError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function messageRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/messages${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new MessagesError(
      data?.error || data?.message || `HTTP ${res.status}`,
      res.status,
    );
  }

  return res.json();
}

export function getMessageBootstrap() {
  return messageRequest<MessageBootstrap>("/bootstrap");
}

export function getMessageThread(threadId: number, before?: string) {
  const qs = before ? `?before=${encodeURIComponent(before)}` : "";
  return messageRequest<MessageThread>(`/threads/${threadId}${qs}`);
}

export function sendMessage(to: string, body: string) {
  return messageRequest<unknown>("/messages", {
    method: "POST",
    body: JSON.stringify({ to, body }),
  });
}

export async function webLogin(login: string, password: string): Promise<void> {
  const res = await fetch("/api/web-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new MessagesError(
      data?.error || "Could not sign in to BDSMLR messages",
      res.status,
    );
  }
}

export function webLogout(): Promise<void> {
  return fetch("/api/web-logout", {
    method: "POST",
    credentials: "include",
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}
