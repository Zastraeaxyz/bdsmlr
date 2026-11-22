import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A } from "@solidjs/router";
import { MessageCircle, Send } from "lucide-solid";
import {
  commentPost,
  listPostComments,
  type PostComment,
} from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { BlogAvatar } from "~/components/BlogAvatar";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { formatRelativeDate } from "~/lib/date";
import { surfaceForPath, textLengthBucket, trackEvent } from "~/lib/analytics";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const PAGE_SIZE = 20;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const value = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function commentBodyText(body?: string): string {
  if (!body) return "";
  const withBreaks = body
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(withBreaks).replace(/\n{3,}/g, "\n\n").trim();
}

export interface CommentsProps {
  postId: number;
  initialCount?: number;
  onCountChange?: (count: number) => void;
}

export function Comments(props: CommentsProps) {
  const { user, activeBlog } = useAuth();
  const [comments, setComments] = createSignal<PostComment[]>([]);
  const [count, setCount] = createSignal(props.initialCount ?? 0);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [draft, setDraft] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  let nextPageToken: string | undefined;

  const updateCount = (value: number) => {
    setCount(value);
    props.onCountChange?.(value);
  };

  createEffect(() => {
    const postId = props.postId;
    if (!postId) {
      setLoading(false);
      return;
    }
    nextPageToken = undefined;
    setComments([]);
    setError("");
    setLoading(true);
    listPostComments(postId, PAGE_SIZE)
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const list = data.comments ?? [];
        setComments(list);
        updateCount(Math.max(props.initialCount ?? 0, list.length));
        nextPageToken = data.page?.nextPageToken;
      })
      .catch((err: unknown) => {
        setError((err as Error)?.message || "Failed to load comments");
      })
      .finally(() => setLoading(false));
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    const token = nextPageToken;
    setLoadingMore(true);
    try {
      const data = await listPostComments(props.postId, PAGE_SIZE, token);
      if (data.error) throw new Error(data.error);
      const incoming = data.comments ?? [];
      setComments((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more comments");
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async (event: Event) => {
    event.preventDefault();
    const text = draft().trim();
    const currentUser = user();
    const blog = activeBlog();
    if (!text || !currentUser || !blog || submitting()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await commentPost(props.postId, text, blog.id);
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || "Could not post comment");
      }
      const posted: PostComment = {
        postId: props.postId,
        userId: currentUser.user_id,
        blogId: blog.id,
        blogName: blog.name,
        body: text,
        createdAtUnix: Math.floor(Date.now() / 1000),
      };
      setComments((prev) => [posted, ...prev]);
      updateCount(count() + 1);
      trackEvent("comment-submit", {
        surface:
          typeof window === "undefined"
            ? "post"
            : surfaceForPath(window.location.pathname),
        length: textLengthBucket(text.length),
      });
      setDraft("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class="flex flex-col gap-4">
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle class="size-4" />
        Comments ({count()})
      </h3>

      <Show
        when={user() && activeBlog()}
        fallback={
          <p class="text-sm text-muted-foreground">Sign in to comment.</p>
        }
      >
        <form class="flex flex-col gap-2" onSubmit={submit}>
          <textarea
            class="min-h-20 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            placeholder="Write a comment…"
            value={draft()}
            onInput={(event) => setDraft(event.currentTarget.value)}
            rows={3}
          />
          <Button
            type="submit"
            size="sm"
            class="self-end"
            disabled={!draft().trim() || submitting()}
          >
            <Send class="size-4" />
            {submitting() ? "Posting…" : "Comment"}
          </Button>
        </form>
      </Show>


      <Show when={error()}>
        <FeedErrorNotice message={error()} />
      </Show>

      <Show when={loading()}>
        <div class="flex flex-col gap-3">
          <For each={[0, 1, 2]}>
            {() => (
              <div class="flex gap-3">
                <Skeleton class="size-7 rounded-full" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-3 w-32" />
                  <Skeleton class="h-3 w-full" />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>


      <Show when={!loading()}>
        <Show
          when={comments().length > 0}
          fallback={
            <p class="py-4 text-center text-sm text-muted-foreground">
              No comments yet.
            </p>
          }
        >
          <div class="flex flex-col divide-y divide-border">
            <For each={comments()}>
              {(comment) => (
                <div class="flex gap-3 py-3">
                  <BlogAvatar
                    blogId={comment.blogId}
                    blogName={comment.blogName}
                    size={28}
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <A
                        href={`/${comment.blogName}`}
                        class="text-sm font-medium hover:underline"
                      >
                        {comment.blogName}
                      </A>
                      <Show when={comment.createdAtUnix}>
                        <span class="text-xs text-muted-foreground">
                          {formatRelativeDate(comment.createdAtUnix!)}
                        </span>
                      </Show>
                    </div>
                    <p class="mt-1 whitespace-pre-line break-words text-sm">
                      {commentBodyText(comment.body)}
                    </p>
                  </div>
                </div>
              )}
            </For>
          </div>
          <Show when={nextPageToken}>
            <AutoLoadMore
              onLoad={loadMore}
              loading={loadingMore()}
              label="Load more comments"
              loadingLabel="Loading more…"
            />
          </Show>
        </Show>
      </Show>
    </section>
  );
}
