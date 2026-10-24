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
import { PostCard } from "~/components/PostCard";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { BlogAvatar } from "~/components/BlogAvatar";
import { LightBox } from "~/components/LightBox";
import SortDropdown from "~/components/SortDropdown";
import { upgradeToLightbox } from "~/lib/sanitize";
import { tagSearchHref } from "~/lib/tagLinks";
import { markActivitySeen } from "~/lib/activityUnread";

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
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  let nextPageToken: string | null = null;

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

  const toggleKind = (kind: ActivityKind) => {
    setSelected((prev) =>
      prev.includes(kind)
        ? prev.filter((value) => value !== kind)
        : [...prev, kind],
    );
  };

  const load = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    nextPageToken = null;
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
    <div>
      <div class="activity-controls">
        <div class="activity-filters">
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
              <button
                type="button"
                class={
                  selected().includes(entry[0])
                    ? "activity-filter active"
                    : "activity-filter"
                }
                onClick={() => toggleKind(entry[0])}
                aria-pressed={selected().includes(entry[0])}
              >
                {entry[1]}
              </button>
            )}
          </For>
        </div>
        <SortDropdown
          value={`${sortField()}-${sortOrder()}`}
          onChange={(sf, so) => {
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

      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading activity…</p>}
      <Show when={!loading()}>
        <Show
          when={visible().length > 0}
          fallback={<p class="empty">No activity for these filters.</p>}
        >
          <div class="feed">
            <For each={visible()}>
              {(item) => (
                <Show
                  when={item.type === 1 && item.post}
                  fallback={
                    <div class="activity-cluster">
                      <div class="activity-cluster-head">
                        <span class="activity-cluster-label">
                          {item.cluster?.label ?? "Activity"}
                        </span>
                        <span class="activity-cluster-count">
                          {item.cluster?.interactions?.length ?? 0}
                        </span>
                      </div>
                      <div class="activity-cluster-list">
                        <For each={item.cluster?.interactions ?? []}>
                          {(interaction, index) => (
                            <Show when={index() < 12}>
                              <A
                                href={`/${interaction.blogName}/post/${interaction.id}`}
                                class="activity-cluster-item"
                              >
                                <BlogAvatar
                                  blogId={interaction.blogId}
                                  blogName={interaction.blogName}
                                  size={24}
                                  linkable={false}
                                />
                                <span class="activity-cluster-main">
                                  <span class="activity-cluster-blog">
                                    {interaction.blogName}
                                  </span>
                                  <Show when={postSnippet(interaction)}>
                                    <span class="activity-cluster-snippet">
                                      {postSnippet(interaction)}
                                    </span>
                                  </Show>
                                </span>
                              </A>
                            </Show>
                          )}
                        </For>
                        <Show
                          when={
                            (item.cluster?.interactions?.length ?? 0) > 12
                          }
                        >
                          <span class="activity-cluster-more">
                            and {(item.cluster?.interactions?.length ?? 0) - 12}{" "}
                            more
                          </span>
                        </Show>
                      </div>
                    </div>
                  }
                >
                  <PostCard
                    post={item.post!}
                    onTagClick={openTag}
                    onImageClick={(url) =>
                      setLightboxUrl(upgradeToLightbox(url))
                    }
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
      <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
