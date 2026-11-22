import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A } from "@solidjs/router";
import { Heart, Repeat2 } from "lucide-solid";
import {
  listPostLikes,
  listPostReblogs,
  type PostLikesResponse,
  type PostReblogsResponse,
} from "~/lib/api";
import { BlogAvatar } from "~/components/BlogAvatar";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { formatRelativeDate } from "~/lib/date";
import { sheetDialogClass } from "~/lib/ui";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";

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
  const [nextReblogToken, setNextReblogToken] = createSignal<string | null>(null);

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

    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogPortal>
        <DialogContent class={`${sheetDialogClass} max-h-[80dvh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>Likes and reblogs</DialogTitle>
            <DialogDescription>
              People who liked or reblogged this post.
            </DialogDescription>
          </DialogHeader>

          <Show when={error()}>
            <FeedErrorNotice message={error()} onRetry={() => void load()} />
          </Show>

          <Show when={loading()}>
            <div class="flex flex-col gap-3">
              <For each={[0, 1, 2, 3]}>
                {() => (
                  <div class="flex items-center gap-3">
                    <Skeleton class="size-8 rounded-full" />
                    <Skeleton class="h-4 w-40" />
                  </div>

                )}
              </For>
            </div>
          </Show>

          <Show when={!loading()}>
            <Show
              when={items().length > 0}
              fallback={
                <p class="py-8 text-center text-sm text-muted-foreground">
                  No likes or reblogs yet.
                </p>
              }
            >
              <div class="flex flex-col">
                <For each={items()}>
                  {(item) => (
                    <A
                      href={`/${item.blogName}`}
                      class="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-accent"
                    >
                      <BlogAvatar
                        blogId={item.blogId}
                        blogName={item.blogName}
                        size={32}
                        linkable={false}
                      />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">
                          {item.blogName}
                        </p>
                        <p class="flex items-center gap-1 text-xs text-muted-foreground">
                          <Show
                            when={item.kind === "like"}
                            fallback={<Repeat2 class="size-3.5" />}
                          >
                            <Heart class="size-3.5" />
                          </Show>
                          {item.kind === "like" ? "Liked" : "Reblogged"}
                          <Show when={item.createdAtUnix}>
                            <span>· {formatRelativeDate(item.createdAtUnix!)}</span>
                          </Show>
                        </p>
                      </div>
                    </A>
                  )}
                </For>
              </div>
              <Show when={hasMore()}>
                <AutoLoadMore
                  onLoad={loadMore}
                  loading={loadingMore()}
                  loadingLabel="Loading…"
                />
              </Show>
            </Show>
          </Show>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
