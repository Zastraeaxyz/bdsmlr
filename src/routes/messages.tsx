import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import {
  getMessageBootstrap,
  getMessageThread,
  sendMessage,
  type Message,
  type MessageThread,
  type MessageThreadSummary,
} from "~/lib/messages";
import { formatRelativeDate } from "~/lib/date";

function messageTime(value?: string): string {
  if (!value) return "";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "";
  return formatRelativeDate(Math.floor(ms / 1000));
}

function fullTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function avatarUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return null;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [threads, setThreads] = createSignal<MessageThreadSummary[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [showArchived, setShowArchived] = createSignal(false);
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [thread, setThread] = createSignal<MessageThread | null>(null);
  const [threadLoading, setThreadLoading] = createSignal(false);
  const [loadingOlder, setLoadingOlder] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [showNew, setShowNew] = createSignal(false);
  const [newTo, setNewTo] = createSignal("");
  const [newBody, setNewBody] = createSignal("");
  const [creating, setCreating] = createSignal(false);

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const filteredThreads = () => {
    const q = search().trim().toLowerCase();
    return threads()
      .filter((t) => {
        if (!showArchived() && t.archived) return false;
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.preview ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const at = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bt = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bt - at;
      });
  };

  const openThread = async (id: number) => {
    setSelectedId(id);
    setThread(null);
    setThreadLoading(true);
    setError("");
    try {
      const data = await getMessageThread(id);
      setThread(data);
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, unread: false } : t)),
      );
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load conversation");
    } finally {
      setThreadLoading(false);
    }
  };

  const loadBootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMessageBootstrap();
      setThreads(data.threads ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    void loadBootstrap();
  });

  const submitMessage = async (e: Event) => {
    e.preventDefault();
    const current = thread();
    const body = draft().trim();
    if (!current || !body || sending()) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(current.thread.name, body);
      const optimistic: Message = {
        id: -Date.now(),
        body,
        sent_by_me: true,
        created_at: new Date().toISOString(),
      };
      setThread((prev) =>
        prev ? { ...prev, messages: [...(prev.messages ?? []), optimistic] } : prev,
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.id === current.thread.id
            ? {
                ...t,
                preview: body,
                updated_at: new Date().toISOString(),
                unread: false,
              }
            : t,
        ),
      );
      setDraft("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const submitNew = async (e: Event) => {
    e.preventDefault();
    const to = newTo().trim();
    const body = newBody().trim();
    if (!to || !body || creating()) return;
    setCreating(true);
    setError("");
    try {
      await sendMessage(to, body);
      setShowNew(false);
      setNewTo("");
      setNewBody("");
      const data = await getMessageBootstrap();
      const list = data.threads ?? [];
      setThreads(list);
      const created = list.find(
        (t) => t.name.toLowerCase() === to.toLowerCase(),
      );
      if (created) await openThread(created.id);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not send message");
    } finally {
      setCreating(false);
    }
  };

  const loadOlder = async () => {
    const current = thread();
    const before = current?.next_before;
    if (!current || !before || loadingOlder()) return;
    setLoadingOlder(true);
    try {
      const data = await getMessageThread(current.thread.id, before);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(data.messages ?? []), ...(prev.messages ?? [])],
              next_before: data.next_before,
            }
          : data,
      );
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Messages - bbdsmlr</Title>
      <div class="home-page messages-page">
        <Header info="Messages">
          <button
            type="button"
            class="btn-ghost"
            onClick={() => {
              setError("");
              setShowNew(true);
            }}
          >
            New message
          </button>
        </Header>
        <main class="messages-layout">
          <aside class="messages-sidebar">
            <div class="messages-filters">
              <input
                type="search"
                placeholder="Search messages…"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
              <label class="messages-archived">
                <input
                  type="checkbox"
                  checked={showArchived()}
                  onChange={(e) => setShowArchived(e.currentTarget.checked)}
                />
                Show archived
              </label>
            </div>
            <Show when={loading()}>
              <p class="loading messages-loading">Loading messages…</p>
            </Show>
            <Show when={!loading() && filteredThreads().length === 0}>
              <p class="empty messages-loading">No conversations found.</p>
            </Show>
            <div class="messages-list">
              <For each={filteredThreads()}>
                {(item) => (
                  <button
                    type="button"
                    class={
                      item.id === selectedId()
                        ? "message-thread active"
                        : "message-thread"
                    }
                    onClick={() => openThread(item.id)}
                  >
                    <Show
                      when={avatarUrl(item.avatar_url)}
                      fallback={
                        <span class="message-avatar message-avatar-fallback">
                          {item.name[0]?.toUpperCase() ?? "?"}
                        </span>
                      }
                    >
                      <img
                        class="message-avatar"
                        src={avatarUrl(item.avatar_url)!}
                        alt=""
                      />
                    </Show>
                    <span class="message-thread-text">
                      <span class="message-thread-top">
                        <span class="message-thread-name">{item.name}</span>
                        <span class="message-thread-time">
                          {messageTime(item.updated_at)}
                        </span>
                      </span>
                      <span class="message-thread-preview">
                        {item.preview}
                      </span>
                    </span>
                    <Show when={item.unread}>
                      <span class="message-unread-dot" />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </aside>

          <section class="messages-panel">
            <Show
              when={thread()}
              fallback={
                <div class="messages-placeholder">
                  <Show
                    when={threadLoading()}
                    fallback={
                      <p class="empty">Select a conversation to start reading.</p>
                    }
                  >
                    <p class="loading">Loading conversation…</p>
                  </Show>
                </div>
              }
            >
              <header class="messages-panel-header">
                <Show
                  when={avatarUrl(thread()!.thread.avatar_url)}
                  fallback={
                    <span class="message-avatar message-avatar-fallback">
                      {thread()!.thread.name[0]?.toUpperCase() ?? "?"}
                    </span>
                  }
                >
                  <img
                    class="message-avatar"
                    src={avatarUrl(thread()!.thread.avatar_url)!}
                    alt=""
                  />
                </Show>
                <div>
                  <A
                    href={`/${thread()!.thread.name}`}
                    class="messages-panel-name"
                  >
                    {thread()!.thread.name}
                  </A>
                  <div class="messages-panel-meta">
                    {thread()!.thread.preview}
                  </div>
                </div>
              </header>

              <div class="messages-conversation">
                <Show when={thread()!.next_before}>
                  <button
                    type="button"
                    class="btn-ghost messages-older"
                    onClick={loadOlder}
                    disabled={loadingOlder()}
                  >
                    {loadingOlder() ? "Loading…" : "Load older messages"}
                  </button>
                </Show>
                <For each={thread()!.messages ?? []}>
                  {(message) => (
                    <div
                      class={
                        message.sent_by_me
                          ? "message-bubble mine"
                          : "message-bubble"
                      }
                    >
                      <div class="message-bubble-body">{message.body}</div>
                      <div class="message-bubble-time">
                        {fullTime(message.created_at)}
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <form class="messages-composer" onSubmit={submitMessage}>
                <textarea
                  rows={2}
                  placeholder="Write a message…"
                  value={draft()}
                  onInput={(e) => setDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button type="submit" disabled={!draft().trim() || sending()}>
                  {sending() ? "Sending…" : "Send"}
                </button>
              </form>
            </Show>
          </section>
        </main>

        <Show when={error()}>
          <p class="error messages-error">{error()}</p>
        </Show>
      </div>

      <Show when={showNew()}>
        <div class="tag-modal-backdrop" onClick={() => setShowNew(false)}>
          <form
            class="tag-modal new-message-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNew}
          >
            <button
              type="button"
              class="tag-modal-close"
              onClick={() => setShowNew(false)}
              aria-label="Close new message"
            >
              ×
            </button>
            <h3>New message</h3>
            <label class="new-message-label">
              To
              <input
                type="text"
                placeholder="Blog name"
                value={newTo()}
                onInput={(e) => setNewTo(e.currentTarget.value)}
              />
            </label>
            <label class="new-message-label">
              Message
              <textarea
                rows={5}
                placeholder="Write a message…"
                value={newBody()}
                onInput={(e) => setNewBody(e.currentTarget.value)}
              />
            </label>
            <Show when={error()}>
              <p class="error">{error()}</p>
            </Show>
            <button
              type="submit"
              disabled={!newTo().trim() || !newBody().trim() || creating()}
            >
              {creating() ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </Show>
    </Show>
  );
}
