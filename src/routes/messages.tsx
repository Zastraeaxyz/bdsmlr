import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import {
  archiveMessageThread,
  blockMessageThread,
  clearMessageThread,
  getMessageBootstrap,
  getMessageThread,
  sendMessage,
  sendMessageImage,
  type Message,
  type MessageThread,
  type MessageThreadSummary,
} from "~/lib/messages";
import { searchBlogs, type Blog } from "~/lib/api";
import { setUnreadFromThreads } from "~/lib/messageUnread";
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
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [threads, setThreads] = createSignal<MessageThreadSummary[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [showArchived, setShowArchived] = createSignal(false);
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [thread, setThread] = createSignal<MessageThread | null>(null);
  const [threadLoading, setThreadLoading] = createSignal(false);
  const [loadingOlder, setLoadingOlder] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [sendingImage, setSendingImage] = createSignal(false);
  const [threadActionBusy, setThreadActionBusy] = createSignal(false);
  const [showNew, setShowNew] = createSignal(false);
  const [newTo, setNewTo] = createSignal("");
  const [newBody, setNewBody] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const [suggestions, setSuggestions] = createSignal<Blog[]>([]);
  const [suppressSuggestions, setSuppressSuggestions] = createSignal(false);
  let conversationRef: HTMLDivElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = conversationRef;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const updateThreads = (
    updater: (threads: MessageThreadSummary[]) => MessageThreadSummary[],
  ) => {
    setThreads((prev) => {
      const next = updater(prev);
      setUnreadFromThreads(next);
      return next;
    });
  };

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  createEffect(() => {
    const q = newTo().trim();
    if (!showNew() || suppressSuggestions() || q.length < 2) {
      if (!suppressSuggestions()) setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchBlogs(q, 6)
        .then((data) => setSuggestions(data.blogs ?? []))
        .catch(() => setSuggestions([]));
    }, 250);
    onCleanup(() => clearTimeout(timer));
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
    setNotice("");
    try {
      const data = await getMessageThread(id);
      setThread(data);
      scrollToBottom();
      updateThreads((prev) =>
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
      const list = data.threads ?? [];
      setThreads(list);
      setUnreadFromThreads(list);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    const recipient = (searchParams.to as string) || "";
    if (recipient) {
      setNewTo(recipient);
      setShowNew(true);
    }
    void loadBootstrap();
  });

  const appendSent = (data: {
    thread_id: number;
    target: { name: string; avatar_url?: string };
    message: Message;
  }) => {
    setThread((prev) =>
      prev && prev.thread.id === data.thread_id
        ? { ...prev, messages: [...(prev.messages ?? []), data.message] }
        : prev,
    );
    const preview = data.message.body || (data.message.media_urls?.length ? "Image" : "");
    updateThreads((prev) => {
      const known = prev.some((t) => t.id === data.thread_id);
      if (!known) {
        return [
          ...prev,
          {
            id: data.thread_id,
            name: data.target.name,
            avatar_url: data.target.avatar_url,
            preview,
            last_message_id: data.message.id,
            updated_at: data.message.created_at ?? new Date().toISOString(),
            unread: false,
            archived: false,
            blocked: false,
          },
        ];
      }
      return prev.map((t) =>
        t.id === data.thread_id
          ? {
              ...t,
              preview,
              last_message_id: data.message.id,
              updated_at: data.message.created_at ?? new Date().toISOString(),
              unread: false,
              archived: false,
            }
          : t,
      );
    });
    scrollToBottom();
  };

  const submitMessage = async (e: Event) => {
    e.preventDefault();
    const current = thread();
    const body = draft().trim();
    if (!current || !body || sending()) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const data = await sendMessage(current.thread.name, body);
      appendSent(data);
      setDraft("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const handleImage = async (e: Event) => {
    const current = thread();
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!current || !file || sendingImage() || current.thread.blocked) return;
    setSendingImage(true);
    setError("");
    setNotice("");
    try {
      const data = await sendMessageImage(current.thread.name, file);
      appendSent(data);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not upload image");
    } finally {
      setSendingImage(false);
      input.value = "";
      if (imageInputRef) imageInputRef.value = "";
    }
  };

  const submitNew = async (e: Event) => {
    e.preventDefault();
    const to = newTo().trim();
    const body = newBody().trim();
    if (!to || !body || creating()) return;
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const data = await sendMessage(to, body);
      setShowNew(false);
      setNewTo("");
      setNewBody("");
      setSuggestions([]);
      const bootstrap = await getMessageBootstrap();
      const list = bootstrap.threads ?? [];
      setThreads(list);
      setUnreadFromThreads(list);
      if (data.thread_id) await openThread(data.thread_id);
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
    const el = conversationRef;
    const previousHeight = el?.scrollHeight ?? 0;
    const previousTop = el?.scrollTop ?? 0;
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
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - previousHeight + previousTop;
      });
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  const archiveThread = async () => {
    const current = thread();
    if (!current || threadActionBusy()) return;
    if (!window.confirm("Archive this conversation?")) return;
    setThreadActionBusy(true);
    setError("");
    setNotice("");
    try {
      await archiveMessageThread(current.thread.id);
      updateThreads((prev) =>
        prev.map((t) =>
          t.id === current.thread.id ? { ...t, archived: true } : t,
        ),
      );
      setThread(null);
      setSelectedId(null);
      setNotice("Conversation archived.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not archive conversation");
    } finally {
      setThreadActionBusy(false);
    }
  };

  const clearThread = async () => {
    const current = thread();
    if (!current || threadActionBusy()) return;
    if (
      !window.confirm(
        "Clear this conversation for your account? This removes it from your inbox.",
      )
    )
      return;
    setThreadActionBusy(true);
    setError("");
    setNotice("");
    try {
      await clearMessageThread(current.thread.id);
      updateThreads((prev) =>
        prev.filter((t) => t.id !== current.thread.id),
      );
      setThread(null);
      setSelectedId(null);
      setNotice("Conversation cleared.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not clear conversation");
    } finally {
      setThreadActionBusy(false);
    }
  };

  const toggleBlock = async () => {
    const current = thread();
    if (!current || threadActionBusy()) return;
    setThreadActionBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await blockMessageThread(current.thread.id);
      const isBlocked = !!data.blocked;
      setThread((prev) =>
        prev
          ? { ...prev, thread: { ...prev.thread, blocked: isBlocked } }
          : prev,
      );
      updateThreads((prev) =>
        prev.map((t) =>
          t.id === current.thread.id ? { ...t, blocked: isBlocked } : t,
        ),
      );
      setNotice(isBlocked ? "Conversation blocked." : "Conversation unblocked.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not update block");
    } finally {
      setThreadActionBusy(false);
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
              setNotice("");
              setSuppressSuggestions(false);
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
                        <Show when={item.archived}>
                          <span class="message-thread-chip">Archived</span>
                        </Show>
                        <Show when={item.blocked}>
                          <span class="message-thread-chip danger">
                            Blocked
                          </span>
                        </Show>
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
                <div class="messages-panel-title">
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
                <div class="messages-panel-actions">
                  <button
                    type="button"
                    class="messages-thread-action"
                    onClick={toggleBlock}
                    disabled={threadActionBusy()}
                  >
                    {thread()!.thread.blocked ? "Unblock" : "Block"}
                  </button>
                  <button
                    type="button"
                    class="messages-thread-action"
                    onClick={archiveThread}
                    disabled={threadActionBusy()}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    class="messages-thread-action danger-text"
                    onClick={clearThread}
                    disabled={threadActionBusy()}
                  >
                    Clear
                  </button>
                </div>
              </header>

              <div
                class="messages-conversation"
                ref={(el) => (conversationRef = el)}
              >
                <Show when={thread()!.thread.blocked}>
                  <p class="messages-blocked-note">
                    This conversation is blocked. Unblock it to send messages.
                  </p>
                </Show>
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
                      <Show when={message.body}>
                        <div class="message-bubble-body">{message.body}</div>
                      </Show>
                      <Show when={(message.media_urls?.length ?? 0) > 0}>
                        <div class="message-bubble-media">
                          <For each={message.media_urls ?? []}>
                            {(url) => <img src={url} alt="Shared image" />}
                          </For>
                        </div>
                      </Show>
                      <div class="message-bubble-time">
                        {fullTime(message.created_at)}
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <form class="messages-composer" onSubmit={submitMessage}>
                <label class="messages-attach" title="Attach image">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    disabled={
                      sendingImage() || !!thread()!.thread.blocked
                    }
                  />
                  <span>{sendingImage() ? "…" : "📎"}</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Write a message…"
                  value={draft()}
                  onInput={(e) => setDraft(e.currentTarget.value)}
                  disabled={!!thread()!.thread.blocked}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={
                    !draft().trim() ||
                    sending() ||
                    !!thread()!.thread.blocked
                  }
                >
                  {sending() ? "Sending…" : "Send"}
                </button>
              </form>
            </Show>
          </section>
        </main>

        <Show when={error()}>
          <p class="error messages-error">{error()}</p>
        </Show>
        <Show when={notice()}>
          <p class="action-notice messages-notice">{notice()}</p>
        </Show>
      </div>

      <Show when={showNew()}>
        <div
          class="tag-modal-backdrop"
          onClick={() => {
            setShowNew(false);
            setSuggestions([]);
          }}
        >
          <form
            class="tag-modal new-message-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNew}
          >
            <button
              type="button"
              class="tag-modal-close"
              onClick={() => {
                setShowNew(false);
                setSuggestions([]);
              }}
              aria-label="Close new message"
            >
              ×
            </button>
            <h3>New message</h3>
            <label class="new-message-label new-message-recipient">
              To
              <input
                type="text"
                placeholder="Blog name"
                autocomplete="off"
                value={newTo()}
                onInput={(e) => {
                  setSuppressSuggestions(false);
                  setNewTo(e.currentTarget.value);
                }}
              />
              <Show when={suggestions().length > 0}>
                <div class="recipient-suggestions">
                  <For each={suggestions()}>
                    {(blog) => (
                      <button
                        type="button"
                        class="recipient-suggestion"
                        onClick={() => {
                          setSuppressSuggestions(true);
                          setNewTo(blog.name);
                          setSuggestions([]);
                        }}
                      >
                        <Show
                          when={blog.avatarUrl}
                          fallback={
                            <span class="recipient-suggestion-avatar">
                              {(blog.title || blog.name || "?")[0]}
                            </span>
                          }
                        >
                          <img
                            class="recipient-suggestion-avatar"
                            src={blog.avatarUrl}
                            alt=""
                          />
                        </Show>
                        <span class="recipient-suggestion-text">
                          <span class="recipient-suggestion-name">
                            {blog.name}
                          </span>
                          <Show when={blog.title}>
                            <span class="recipient-suggestion-title">
                              {blog.title}
                            </span>
                          </Show>
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
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
