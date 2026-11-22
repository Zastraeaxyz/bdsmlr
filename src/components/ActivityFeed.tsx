import { createEffect, createSignal, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import {
  listBlogActivity,
  resolveIdentifier,
  PostVariant,
  SortField,
  SortOrder,
  type Post,
} from "~/lib/api";
import { PostFeed } from "~/components/PostFeed";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { BlogAvatar } from "~/components/BlogAvatar";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { LightBox } from "~/components/LightBox";
import SortDropdown, { sortOptionLabel } from "~/components/SortDropdown";
import { createMediaGallery } from "~/lib/mediaGallery";
import { tagSearchHref } from "~/lib/tagLinks";
import { markActivitySeen } from "~/lib/activityUnread";
import { trackEvent } from "~/lib/analytics";

const PAGE_SIZE = 20;

type ActivityKind = "post" | "reblog" | "like" | "comment";

interface TimelineItem {
  type: number;
  post?: Post;
  cluster?: { label?: string; interactions?: Post[] };
}

function postSnippet(post: Post): string {
  const text =
    post.title ||
    post.content?.title ||
    post.content?.text ||
    post.body ||
    post.content?.html ||
    "";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function clusterKind(item: TimelineItem): ActivityKind | "activity" {
  const label = (item.cluster?.label ?? "").toLowerCase();
  if (label.includes("comment")) return "comment";
  if (label.includes("like")) return "like";
  if (label.includes("reblog")) return "reblog";
  return "activity";
}

export function ActivityFeed(props: { blogName: string }) {
  const navigate = useNavigate();
  const [items, setItems] = createSignal<TimelineItem[]>([]);
  const [selected, setSelected] = createSignal<ActivityKind[]>([
    "post",
    "reblog",
    "like",
    "comment",
  ]);
  const [sortField, setSortField] = createSignal<number>(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal<number>(SortOrder.Descending);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  let nextPageToken: string | null = null;
  let loadedKey = "";

  const matches = (item: TimelineItem): boolean => {
    const chosen = selected();
    if (item.type === 1 && item.post) {
      const kind: ActivityKind =
        item.post.variant === PostVariant.Reblog ? "reblog" : "post";
      return chosen.includes(kind);
    }
    if (item.type === 2) {
      const kind = clusterKind(item);
      if (kind === "activity") return chosen.length === 4;
      return chosen.includes(kind);
    }
    return false;
  };

  const visible = () => items().filter(matches);

  const gallery = createMediaGallery({
    posts: () =>
      visible()
        .filter((item) => item.type === 1 && item.post)
        .map((item) => item.post!),
  });

  const toggleKind = (kind: ActivityKind) => {
    trackEvent("activity-filter", { filter: kind });
    setSelected((prev) =>
      prev.includes(kind)
        ? prev.filter((value) => value !== kind)
        : [...prev, kind],
    );
  };

  const load = async () => {
    setLoading(true);
    setError("");
    const target = `${props.blogName}|${sortField()}|${sortOrder()}`;
    if (target !== loadedKey) {
      setItems([]);
      nextPageToken = null;
    }
    try {
      const resolved = await resolveIdentifier(props.blogName);
      if (!resolved.blogId) {
        setError(resolved.error || "Blog not found");
        return;
      }
      const data = await listBlogActivity({
        blog_id: resolved.blogId,
        blog_name: props.blogName,
        sort_field: sortField(),
        order: sortOrder(),
        post_types: [1, 2, 3, 4, 5, 6, 7],
        activity_kinds: ["post", "reblog", "like", "comment"],
        page: { page_size: PAGE_SIZE },
        page_size: PAGE_SIZE,
      });
      if (data.error) throw new Error(data.error);
      const incoming = data.timelineItems ?? [];
      setItems(incoming);
      loadedKey = target;
      markActivitySeen(resolved.blogId, incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextPageToken = null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.blogName;
    sortField();
    sortOrder();
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      const resolved = await resolveIdentifier(props.blogName);
      if (!resolved.blogId) return;
      const data = await listBlogActivity({
        blog_id: resolved.blogId,
        blog_name: props.blogName,
        sort_field: sortField(),
        order: sortOrder(),
        post_types: [1, 2, 3, 4, 5, 6, 7],
        activity_kinds: ["post", "reblog", "like", "comment"],
        page: { page_size: PAGE_SIZE, page_token: token },
        page_size: PAGE_SIZE,
      });
      if (data.error) throw new Error(data.error);
      const incoming = data.timelineItems ?? [];
      setItems((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextPageToken = null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more activity");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(tagSearchHref(tag));
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-1.5">
          <For
            each={
              [
                ["post", "Posts"],
                ["reblog", "Reblogs"],
                ["like", "Likes"],
                ["comment", "Comments"],
              ] as const
            }
          >
            {(entry) => (
              <Button
                type="button"
                size="sm"
                variant={selected().includes(entry[0]) ? "default" : "outline"}
                class="h-8 rounded-full px-3 text-xs"
                onClick={() => toggleKind(entry[0])}
                aria-pressed={selected().includes(entry[0])}
              >
                {entry[1]}
              </Button>
            )}
          </For>
        </div>
        <SortDropdown
          value={`${sortField()}-${sortOrder()}`}
          onChange={(sf, so) => {
            trackEvent("sort-change", {
              surface: "activity",
              sort: sortOptionLabel(sf, so),
            });
            setSortField(sf);
            setSortOrder(so);
          }}
          options={{
            newest: true,
            oldest: true,
            mostPopular: true,
            leastPopular: true,
            mostLiked: true,
            mostCommented: true,
            mostReblogged: true,
          }}
        />
      </div>

      <Show when={error()}>
<FeedErrorNotice
          message={error()}
          blogName={props.blogName}
          onRetry={() => void load()}
        />
      </Show>

      <Show when={loading()}>
        <FeedSkeleton />
      </Show>

      <Show when={!loading()}>
        <Show
          when={visible().length > 0}
          fallback={<EmptyState>No activity for these filters.</EmptyState>}
        >
          <div class="flex flex-col gap-2 sm:gap-3">
            <For each={visible()}>
              {(item) => (
                <Show
                  when={item.type === 1 && item.post}
                  fallback={
                    <Card class="gap-0 rounded-none border-x-0 bg-card py-0 shadow-none sm:rounded-xl sm:border-x">
                      <CardHeader class="flex-row items-center justify-between gap-2 border-b px-3 py-2.5">
                        <span class="text-sm font-medium">
                          {item.cluster?.label ?? "Activity"}
                        </span>
                        <Badge variant="secondary">
                          {item.cluster?.interactions?.length ?? 0}
                        </Badge>
                      </CardHeader>
                      <CardContent class="p-0">
                        <For each={item.cluster?.interactions ?? []}>
                          {(interaction, index) => (
                            <Show when={index() < 12}>
                              <A
                                href={`/${interaction.blogName}/post/${interaction.id}`}
                                class="flex items-start gap-3 px-3 py-2.5 hover:bg-accent"
                              >
                                <BlogAvatar
                                  blogId={interaction.blogId}
                                  blogName={interaction.blogName}
                                  size={28}
                                  linkable={false}
                                />
                                <span class="min-w-0 flex-1">
                                  <span class="block text-sm font-medium">
                                    {interaction.blogName}
                                  </span>
                                  <Show when={postSnippet(interaction)}>
                                    <span class="line-clamp-2 block text-xs text-muted-foreground">
                                      {postSnippet(interaction)}
                                    </span>
                                  </Show>
                                </span>
                              </A>
                            </Show>
                          )}
                        </For>
                        <Show when={(item.cluster?.interactions?.length ?? 0) > 12}>
                          <p class="px-3 py-2 text-xs text-muted-foreground">
                            and {(item.cluster?.interactions?.length ?? 0) - 12} more
                          </p>
                        </Show>
                      </CardContent>
                    </Card>
                  }
                >
                  <PostFeed
                    posts={[item.post!]}
                    onTagClick={openTag}
                    onImageClick={(url, postId) => gallery.open(url, postId)}
                  />
                </Show>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={nextPageToken}>
        <AutoLoadMore onLoad={loadMore} loading={loadingMore()} />
      </Show>
      <LightBox gallery={gallery} />
    </div>
  );
}
