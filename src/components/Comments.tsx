import { createEffect, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import {
  commentPost,
  listPostComments,
  type PostComment,
} from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { BlogAvatar } from "~/components/BlogAvatar";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { formatRelativeDate } from "~/lib/date";

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

  const submit = async (e: Event) => {
    e.preventDefault();
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
      setDraft("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class="comments">
      <h3 class="comments-title">Comments ({count()})</h3>

      <Show
        when={user() && activeBlog()}
        fallback={<p class="comments-signin">Sign in to comment.</p>}
      >
        <form class="comment-form" onSubmit={submit}>
          <textarea
            placeholder="Write a comment…"
            value={draft()}
            onInput={(e) => setDraft(e.currentTarget.value)}
            rows={3}
          />
          <button
            type="submit"
            disabled={!draft().trim() || submitting()}
          >
            {submitting() ? "Posting…" : "Comment"}
          </button>
        </form>
      </Show>

      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading comments…</p>}

      <Show when={!loading()}>
        <Show
          when={comments().length > 0}
          fallback={<p class="comments-empty">No comments yet.</p>}
        >
          <div class="comment-list">
            <For each={comments()}>
              {(comment) => (
                <div class="comment">
                  <BlogAvatar
                    blogId={comment.blogId}
                    blogName={comment.blogName}
                    size={24}
                  />
                  <div class="comment-main">
                    <div class="comment-head">
                      <A href={`/${comment.blogName}`} class="comment-blog">
                        {comment.blogName}
                      </A>
                      <Show when={comment.createdAtUnix}>
                        <span class="comment-time">
                          {formatRelativeDate(comment.createdAtUnix!)}
                        </span>
                      </Show>
                    </div>
                    <div class="comment-body">
                      {commentBodyText(comment.body)}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
          <Show when={nextPageToken}>
            <AutoLoadMore
              onLoad={loadMore}
              loading={loadingMore()}
              class="comments-more"
              label="Load more comments"
              loadingLabel="Loading more…"
            />
          </Show>
        </Show>
      </Show>
    </section>
  );
}
