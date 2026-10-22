import { createEffect, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import {
  listPostLikes,
  listPostReblogs,
  type PostLikesResponse,
  type PostReblogsResponse,
} from "~/lib/api";
import { BlogAvatar } from "~/components/BlogAvatar";
import { formatRelativeDate } from "~/lib/date";

const PAGE_SIZE = 30;

interface EngagementItem {
  blogId?: number;
  blogName?: string;
  createdAtUnix?: number;
}

export function EngagementModal(props: {
  postId: number;
  kind: "likes" | "reblogs";
  onClose: () => void;
}) {
  const [items, setItems] = createSignal<EngagementItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  let nextPageToken: string | null = null;

  const load = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    nextPageToken = null;
    try {
      if (props.kind === "likes") {
        const data: PostLikesResponse = await listPostLikes(
          props.postId,
          PAGE_SIZE,
        );
        setItems(data.likes ?? []);
        nextPageToken = data.page?.nextPageToken ?? null;
      } else {
        const data: PostReblogsResponse = await listPostReblogs(
          props.postId,
          PAGE_SIZE,
        );
        setItems(data.reblogs ?? []);
        nextPageToken = data.page?.nextPageToken ?? null;
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load list");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.postId;
    props.kind;
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      if (props.kind === "likes") {
        const data = await listPostLikes(props.postId, PAGE_SIZE, token);
        setItems((prev) => [...prev, ...(data.likes ?? [])]);
        nextPageToken = data.page?.nextPageToken ?? null;
      } else {
        const data = await listPostReblogs(props.postId, PAGE_SIZE, token);
        setItems((prev) => [...prev, ...(data.reblogs ?? [])]);
        nextPageToken = data.page?.nextPageToken ?? null;
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div class="tag-modal-backdrop" onClick={props.onClose}>
      <div
        class="tag-modal engagement-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          class="tag-modal-close"
          onClick={props.onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h3>{props.kind === "likes" ? "Liked by" : "Reblogged by"}</h3>
        {error() && <p class="error">{error()}</p>}
        {loading() && <p class="loading">Loading…</p>}
        <Show when={!loading()}>
          <Show
            when={items().length > 0}
            fallback={<p class="empty">Nobody yet.</p>}
          >
            <div class="engagement-list">
              <For each={items()}>
                {(item) => (
                  <A href={`/${item.blogName}`} class="engagement-item">
                    <BlogAvatar
                      blogId={item.blogId}
                      blogName={item.blogName}
                      size={28}
                      linkable={false}
                    />
                    <span class="engagement-name">{item.blogName}</span>
                    <Show when={item.createdAtUnix}>
                      <span class="engagement-time">
                        {formatRelativeDate(item.createdAtUnix!)}
                      </span>
                    </Show>
                  </A>
                )}
              </For>
            </div>
            <Show when={nextPageToken}>
              <button
                type="button"
                class="btn-ghost engagement-more"
                onClick={loadMore}
                disabled={loadingMore()}
              >
                {loadingMore() ? "Loading…" : "Load more"}
              </button>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
