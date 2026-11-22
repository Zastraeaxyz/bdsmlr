import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-solid";
import { Page } from "~/components/Page";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Checkbox,
  CheckboxControl,
  CheckboxInput,
  CheckboxLabel,
} from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cx } from "~/lib/cva";
import { sheetDialogClass } from "~/lib/ui";
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
import { trackEvent } from "~/lib/analytics";

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

function StatusAlerts(props: {
  error?: string;
  notice?: string;
  class?: string;
}) {
  return (
    <Show when={props.error || props.notice}>
      <div class={cx("flex flex-col gap-2", props.class)} aria-live="polite">
        <Show when={props.error}>
          <Alert variant="destructive">
            <AlertCircle class="size-4" />
            <AlertDescription>{props.error}</AlertDescription>
          </Alert>
        </Show>
        <Show when={props.notice}>
          <Alert>
            <CheckCircle2 class="size-4" />
            <AlertDescription>{props.notice}</AlertDescription>
          </Alert>
        </Show>
      </div>
    </Show>
  );
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
  const [canAutoLoadOlder, setCanAutoLoadOlder] = createSignal(false);
  const [archiveOpen, setArchiveOpen] = createSignal(false);
  const [clearOpen, setClearOpen] = createSignal(false);
  let conversationRef: HTMLDivElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = conversationRef;
      if (el) el.scrollTop = el.scrollHeight;
      setCanAutoLoadOlder(true);
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
    setCanAutoLoadOlder(false);
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
      trackEvent("message-send", { mode: "reply" });
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
      trackEvent("message-image");
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
      trackEvent("message-send", { mode: "new" });
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
    setThreadActionBusy(true);
    setError("");
    setNotice("");
    try {
      await archiveMessageThread(current.thread.id);
      trackEvent("conversation-action", { action: "archive" });
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
    setThreadActionBusy(true);
    setError("");
    setNotice("");
    try {
      await clearMessageThread(current.thread.id);
      trackEvent("conversation-action", { action: "clear" });
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
      trackEvent("conversation-action", {
        action: isBlocked ? "block" : "unblock",
      });
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

  const openNew = () => {
    setError("");
    setNotice("");
    setSuppressSuggestions(false);
    setShowNew(true);
  };

  const closeNew = () => {
    setShowNew(false);
    setSuggestions([]);
  };

  const closeConversation = () => {
    setSelectedId(null);
    setThread(null);
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Messages - bbdsmlr</Title>
      <Page
        info="Messages"
        width="xl"
        padded={false}
        class="md:min-h-0 md:flex-row md:overflow-hidden"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="New message"
            title="New message"
            onClick={openNew}
          >
            <Plus class="size-5" />
          </Button>
        }
      >
        <aside
          class={cx(
            "flex w-full flex-col border-border md:min-h-0 md:w-80 md:shrink-0 md:border-r",
            selectedId() !== null && "max-md:hidden",
          )}
        >
          <div class="shrink-0 space-y-3 border-b border-border px-3 py-3">
            <TextField
              value={search()}
              onChange={setSearch}
              class="gap-0"
            >
              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <TextFieldInput
                  type="search"
                  placeholder="Search messages…"
                  aria-label="Search messages"
                  class="w-full pl-9"
                />
              </div>
            </TextField>
            <Checkbox
              checked={showArchived()}
              onChange={setShowArchived}
              class="flex items-center gap-2"
            >
              <CheckboxInput />
              <CheckboxControl />
              <CheckboxLabel>Show archived</CheckboxLabel>
            </Checkbox>
          </div>

          <div class="shrink-0 md:hidden">
            <StatusAlerts
              error={error()}
              notice={notice()}
              class="px-3 pt-3"
            />
          </div>

          <div class="min-h-0 flex-1 md:overflow-y-auto">
            <Show when={loading()}>
              <div class="flex flex-col gap-1 p-2" aria-busy="true" aria-label="Loading messages">
                <For each={[0, 1, 2, 3, 4, 5]}>
                  {() => (
                    <div class="flex items-center gap-3 rounded-lg px-2 py-2.5">
                      <Skeleton class="size-10 shrink-0 rounded-full" />
                      <div class="min-w-0 flex-1 space-y-2">
                        <Skeleton class="h-3.5 w-32" />
                        <Skeleton class="h-3 w-full max-w-44" />
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={!loading() && filteredThreads().length === 0}>
              <div class="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <MessageSquare class="size-8 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">
                  No conversations found.
                </p>
              </div>
            </Show>

            <div class="flex flex-col py-1">
              <For each={filteredThreads()}>
                {(item) => (
                  <button
                    type="button"
                    class={cx(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      item.id === selectedId()
                        ? "bg-primary/10"
                        : "hover:bg-accent/60",
                    )}
                    aria-current={
                      item.id === selectedId() ? "true" : undefined
                    }
                    onClick={() => openThread(item.id)}
                  >
                    <Avatar
                      src={avatarUrl(item.avatar_url)}
                      fallback={item.name}
                      alt=""
                      class="size-10"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-1.5">
                        <span class="truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        <Show when={item.archived}>
                          <Badge
                            variant="secondary"
                            class="px-1.5 py-0 text-[10px]"
                          >
                            Archived
                          </Badge>
                        </Show>
                        <Show when={item.blocked}>
                          <Badge
                            variant="destructive"
                            class="px-1.5 py-0 text-[10px]"
                          >
                            Blocked
                          </Badge>
                        </Show>
                        <span class="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {messageTime(item.updated_at)}
                        </span>
                      </span>
                      <span class="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.preview}
                      </span>
                    </span>
                    <Show when={item.unread}>
                      <span
                        class="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>
        </aside>

        <section
          class={cx(
            "flex min-h-0 w-full flex-1 flex-col bg-background",
            "max-md:fixed max-md:inset-x-0 max-md:top-[calc(3.5rem_+_env(safe-area-inset-top))] max-md:bottom-[calc(4rem_+_max(0.5rem,env(safe-area-inset-bottom)))] max-md:z-30",
            selectedId() === null ? "max-md:hidden" : "max-md:flex",
          )}
          aria-label="Conversation"
        >
          <StatusAlerts
            error={error()}
            notice={notice()}
            class="shrink-0 px-3 pt-3"
          />
          <Show
            when={thread()}
            fallback={
              <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <Show
                  when={threadLoading()}
                  fallback={
                    <>
                      <MessageSquare class="size-10 text-muted-foreground" />
                      <p class="text-sm text-muted-foreground">
                        Select a conversation to start reading.
                      </p>
                    </>
                  }
                >
                  <Loader2 class="size-6 animate-spin text-muted-foreground" />
                  <p class="text-sm text-muted-foreground">
                    Loading conversation…
                  </p>
                </Show>
              </div>
            }
          >
            <header class="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="md:hidden"
                aria-label="Back to conversations"
                onClick={closeConversation}
              >
                <ArrowLeft class="size-5" />
              </Button>
              <Avatar
                src={avatarUrl(thread()!.thread.avatar_url)}
                fallback={thread()!.thread.name}
                alt=""
                class="size-9"
              />
              <div class="min-w-0 flex-1">
                <A
                  href={`/${thread()!.thread.name}`}
                  class="block truncate text-sm font-semibold hover:underline"
                >
                  {thread()!.thread.name}
                </A>
                <p class="truncate text-xs text-muted-foreground">
                  {thread()!.thread.preview}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger<typeof Button>
                  as={(triggerProps) => (
                    <Button
                      {...triggerProps}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Conversation actions"
                      disabled={threadActionBusy()}
                    >
                      <MoreVertical class="size-5" />
                    </Button>
                  )}
                />
                <DropdownMenuPortal>
                  <DropdownMenuContent class="w-52">
                    <DropdownMenuItem
                      disabled={threadActionBusy()}
                      onSelect={toggleBlock}
                    >
                      <Ban class="size-4" />
                      {thread()!.thread.blocked ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={threadActionBusy()}
                      onSelect={() => setArchiveOpen(true)}
                    >
                      <Archive class="size-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={threadActionBusy()}
                      onSelect={() => setClearOpen(true)}
                    >
                      <Trash2 class="size-4" />
                      Clear conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </header>

            <div
              class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3"
              ref={(el) => (conversationRef = el)}
            >
              <Show when={thread()!.thread.blocked}>
                <Alert variant="warning" class="shrink-0">
                  <Ban class="size-4" />
                  <AlertDescription>
                    This conversation is blocked. Unblock it to send messages.
                  </AlertDescription>
                </Alert>
              </Show>

              <Show when={thread()!.next_before}>
                <AutoLoadMore
                  onLoad={() => void loadOlder()}
                  loading={loadingOlder()}
                  ready={canAutoLoadOlder()}
                  loadingLabel="Loading…"
                  label="Load older messages"
                  class="flex justify-center py-1"
                  root={() => conversationRef}
                  rootMargin="200px 0px 0px 0px"
                />
              </Show>

              <For each={thread()!.messages ?? []}>
                {(message) => (
                  <div
                    class={cx(
                      "flex w-full",
                      message.sent_by_me ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      class={cx(
                        "max-w-[85%] rounded-2xl border px-3 py-2 sm:max-w-[75%]",
                        message.sent_by_me
                          ? "rounded-br-sm border-primary/40 bg-primary/15"
                          : "rounded-bl-sm bg-card",
                      )}
                    >
                      <Show when={message.body}>
                        <p class="whitespace-pre-wrap text-sm break-words">
                          {message.body}
                        </p>
                      </Show>
                      <Show when={(message.media_urls?.length ?? 0) > 0}>
                        <div class="mt-1.5 flex flex-col gap-1.5">
                          <For each={message.media_urls ?? []}>
                            {(url) => (
                              <img
                                src={url}
                                alt="Shared image"
                                loading="lazy"
                                class="max-h-72 w-full rounded-lg object-cover"
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                      <p class="mt-1 text-[10px] text-muted-foreground">
                        {fullTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <form
              class="sticky bottom-0 z-10 flex shrink-0 items-end gap-2 border-t border-border bg-background px-3 py-2"
              onSubmit={submitMessage}
            >
              <Button
                as="label"
                variant="ghost"
                size="icon"
                class="shrink-0 cursor-pointer"
                title="Attach image"
                aria-label="Attach image"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  onChange={handleImage}
                  disabled={sendingImage() || !!thread()!.thread.blocked}
                />
                <Show
                  when={sendingImage()}
                  fallback={<Paperclip class="size-5" />}
                >
                  <Loader2 class="size-5 animate-spin" />
                </Show>
              </Button>

              <TextField
                value={draft()}
                onChange={setDraft}
                class="min-w-0 flex-1 gap-0"
              >
                <TextFieldTextArea
                  rows={2}
                  placeholder="Write a message…"
                  aria-label="Write a message"
                  class="max-h-32 min-h-10 resize-none py-2"
                  disabled={!!thread()!.thread.blocked}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
              </TextField>

              <Button
                type="submit"
                size="icon"
                class="shrink-0"
                aria-label="Send message"
                disabled={
                  !draft().trim() ||
                  sending() ||
                  !!thread()!.thread.blocked
                }
              >
                <Show when={sending()} fallback={<Send class="size-5" />}>
                  <Loader2 class="size-5 animate-spin" />
                </Show>
              </Button>
            </form>
          </Show>
        </section>
      </Page>

      <Dialog
        open={showNew()}
        onOpenChange={(open) => {
          if (!open) closeNew();
        }}
      >
        <DialogPortal>
          <DialogContent
            class={cx(sheetDialogClass, "max-h-[90dvh] overflow-y-auto")}
          >
            <DialogHeader>
              <DialogTitle>New message</DialogTitle>
              <DialogDescription>
                Send a message to another blog.
              </DialogDescription>
            </DialogHeader>

            <form class="grid gap-4" onSubmit={submitNew}>
              <TextField
                value={newTo()}
                onChange={(value) => {
                  setSuppressSuggestions(false);
                  setNewTo(value);
                }}
              >
                <TextFieldLabel>To</TextFieldLabel>
                <TextFieldInput
                  type="text"
                  placeholder="Blog name"
                  autocomplete="off"
                  aria-label="Recipient blog name"
                  class="w-full"
                />
                <Show when={suggestions().length > 0}>
                  <div class="max-h-56 overflow-y-auto rounded-md border border-border">
                    <For each={suggestions()}>
                      {(blog) => (
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-accent"
                          onClick={() => {
                            setSuppressSuggestions(true);
                            setNewTo(blog.name);
                            setSuggestions([]);
                          }}
                        >
                          <Avatar
                            src={blog.avatarUrl}
                            fallback={blog.title || blog.name}
                            alt=""
                            class="size-8"
                          />
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium">
                              {blog.name}
                            </span>
                            <Show when={blog.title}>
                              <span class="block truncate text-xs text-muted-foreground">
                                {blog.title}
                              </span>
                            </Show>
                          </span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </TextField>

              <TextField value={newBody()} onChange={setNewBody}>
                <TextFieldLabel>Message</TextFieldLabel>
                <TextFieldTextArea
                  rows={5}
                  placeholder="Write a message…"
                  aria-label="Message"
                  class="min-h-28"
                />
              </TextField>

              <Show when={error()}>
                <Alert variant="destructive">
                  <AlertCircle class="size-4" />
                  <AlertDescription>{error()}</AlertDescription>
                </Alert>
              </Show>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeNew}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  class="gap-2"
                  disabled={
                    !newTo().trim() || !newBody().trim() || creating()
                  }
                >
                  <Show
                    when={creating()}
                    fallback={<Send class="size-4" />}
                  >
                    <Loader2 class="size-4 animate-spin" />
                  </Show>
                  {creating() ? "Sending…" : "Send message"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>


      <AlertDialog open={archiveOpen()} onOpenChange={setArchiveOpen}>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                It moves out of your inbox. You can still find it with Show
                archived turned on.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={threadActionBusy()}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={threadActionBusy()}
                onClick={() => void archiveThread()}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      <AlertDialog open={clearOpen()} onOpenChange={setClearOpen}>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes it from your inbox for your account. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={threadActionBusy()}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={threadActionBusy()}
                class="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60"
                onClick={() => void clearThread()}
              >
                Clear conversation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

    </Show>
  );
}
