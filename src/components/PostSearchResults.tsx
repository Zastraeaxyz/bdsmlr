import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  searchPostsByTag,
  searchResultPosts,
  PostType,
  SortField,
  SortOrder,
  type Post,
} from "~/lib/api";
import { PostCard } from "~/components/PostCard";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { LightBox } from "~/components/LightBox";
import { upgradeToLightbox } from "~/lib/sanitize";
import { tagSearchHref } from "~/lib/tagLinks";
import { countBucket, trackEvent } from "~/lib/analytics";

const PAGE_SIZE = 20;

export function PostSearchResults(props: {
  query: string;
  postTypes?: number[];
  variants?: number[];
}) {
  const navigate = useNavigate();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  let searchPage = 1;
  let searchSession: string | null = null;
  let hasMore = true;

  const run = async (page: number, session: string | null) =>
    searchPostsByTag({
      tag_name: props.query,
      sort_field: SortField.Date,
      order: SortOrder.Descending,
      post_types: props.postTypes ?? [
        PostType.Text,
        PostType.Image,
        PostType.Video,
        PostType.Audio,
        PostType.Link,
        PostType.Chat,
        PostType.Quote,
      ],
      variants: props.variants ?? [1],
      page,
      ...(session ? { session } : {}),
      page_size: PAGE_SIZE,
    });

  const load = async () => {
    const query = props.query.trim();
    if (!query) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setPosts([]);
    searchPage = 1;
    searchSession = null;
    hasMore = true;
    try {
      let data = await run(1, null);
      for (
        let attempt = 0;
        attempt < 4 &&
        searchResultPosts(data).length === 0 &&
        data.hasMore &&
        data.searchStatus === "warming";
        attempt++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        data = await run(1, null);
      }
      const incoming = searchResultPosts(data);
      setPosts(incoming);
      trackEvent("search-results", {
        surface: "profile",
        count: countBucket(incoming.length),
      });
      searchSession = data.sessionId ?? null;
      searchPage = 2;
      hasMore =
        data.hasMore !== false &&
        !(data.hasMore === undefined && incoming.length < PAGE_SIZE);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.query;
    props.postTypes;
    props.variants;
    void load();
  });

  const loadMore = async () => {
    if (!hasMore || loadingMore() || !searchSession) return;
    setLoadingMore(true);
    try {
      const data = await run(searchPage, searchSession);
      const incoming = searchResultPosts(data);
      setPosts((prev) => [...prev, ...incoming]);
      searchSession = data.sessionId ?? searchSession;
      searchPage++;
      hasMore =
        data.hasMore !== false &&
        !(data.hasMore === undefined && incoming.length < PAGE_SIZE);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    trackEvent("tag-click", { surface: "profile" });
    navigate(tagSearchHref(tag));
  };

  return (
    <div>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Searching…</p>}
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<p class="empty">No posts found.</p>}
        >
          <div class="feed">
            <For each={posts()}>
              {(post) => (
                <PostCard
                  post={post}
                  onTagClick={openTag}
                  onImageClick={(url) =>
                    setLightboxUrl(upgradeToLightbox(url))
                  }
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={hasMore && posts().length > 0}>
        <AutoLoadMore onLoad={loadMore} loading={loadingMore()} />
      </Show>
      <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
