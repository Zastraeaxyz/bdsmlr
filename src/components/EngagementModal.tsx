import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A } from "@solidjs/router";
import {
  listPostLikes,
  listPostReblogs,
  type PostLikesResponse,
  type PostReblogsResponse,
} from "~/lib/api";
import { BlogAvatar } from "~/components/BlogAvatar";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { HeartIcon, ReblogIcon } from "~/components/Icons";
import { formatRelativeDate } from "~/lib/date";

const PAGE_SIZE = 30;

type EngagementKind = "like" | "reblog";

interface EngagementItem {
  kind: EngagementKind;
  blogId?: number;
  blogName?: string;
  createdAtUnix?: number;
}

function mergeItems(items: EngagementItem[]): EngagementItem[] {
  return [...items].sort(
    (a, b) => (b.createdAtUnix ?? 0) - (a.createdAtUnix ?? 0),
  );
}

function fromLikes(data: PostLikesResponse): EngagementItem[] {
  return (data.likes ?? []).map((item) => ({
    kind: "like",
    blogId: item.blogId,
    blogName: item.blogName,
    createdAtUnix: item.createdAtUnix,
  }));
}

function fromReblogs(data: PostReblogsResponse): EngagementItem[] {
  return (data.reblogs ?? []).map((item) => ({
    kind: "reblog",
    blogId: item.blogId,
    blogName: item.blogName,
    createdAtUnix: item.createdAtUnix,
  }));
}

export function EngagementModal(props: {
  postId: number;
  onClose: () => void;
}) {
  const [items, setItems] = createSignal<EngagementItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [nextLikeToken, setNextLikeToken] = createSignal<string | null>(null);
  const [nextReblogToken, setNextReblogToken] = createSignal<string | null>(
    null,
  );

  const hasMore = () => !!nextLikeToken() || !!nextReblogToken();

  const load = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    setNextLikeToken(null);
    setNextReblogToken(null);
    try {
      const [likes, reblogs] = await Promise.all([
        listPostLikes(props.postId, PAGE_SIZE),
        listPostReblogs(props.postId, PAGE_SIZE),
      ]);
      setItems(mergeItems([...fromLikes(likes), ...fromReblogs(reblogs)]));
      setNextLikeToken(likes.page?.nextPageToken ?? null);
      setNextReblogToken(reblogs.page?.nextPageToken ?? null);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.postId;
    void load();
  });

  const loadMore = async () => {
    const likeToken = nextLikeToken();
    const reblogToken = nextReblogToken();
    if ((!likeToken && !reblogToken) || loadingMore()) return;
    setLoadingMore(true);
    try {
      const [likes, reblogs] = await Promise.all([
        likeToken
          ? listPostLikes(props.postId, PAGE_SIZE, likeToken)
          : Promise.resolve(null),
        reblogToken
          ? listPostReblogs(props.postId, PAGE_SIZE, reblogToken)
          : Promise.resolve(null),
      ]);
      const incoming: EngagementItem[] = [];
      if (likes) incoming.push(...fromLikes(likes));
      if (reblogs) incoming.push(...fromReblogs(reblogs));
      setItems((prev) => mergeItems([...prev, ...incoming]));
      setNextLikeToken(likes?.page?.nextPageToken ?? null);
      setNextReblogToken(reblogs?.page?.nextPageToken ?? null);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more activity");
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
        <h3>Likes and reblogs</h3>
        {error() && <FeedErrorNotice message={error()} />}
        {loading() && <p class="loading">Loading…</p>}
        <Show when={!loading()}>
          <Show
            when={items().length > 0}
            fallback={<p class="empty">No likes or reblogs yet.</p>}
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
                    <span class="engagement-action-label">
                      <Show
                        when={item.kind === "like"}
                        fallback={<ReblogIcon class="engagement-icon" />}
                      >
                        <HeartIcon class="engagement-icon" />
                      </Show>
                      {item.kind === "like" ? "Liked" : "Reblogged"}
                    </span>
                    <Show when={item.createdAtUnix}>
                      <span class="engagement-time">
                        {formatRelativeDate(item.createdAtUnix!)}
                      </span>
                    </Show>
                  </A>
                )}
              </For>
            </div>
            <Show when={hasMore()}>
              <AutoLoadMore
                onLoad={loadMore}
                loading={loadingMore()}
                class="engagement-more"
                loadingLabel="Loading…"
              />
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
