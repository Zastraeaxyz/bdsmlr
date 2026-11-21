import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  listBlogActivity,
  PostType,
  SortField,
  SortOrder,
  type ListBlogActivityResponse,
  type Post,
} from "~/lib/api";
import { blogPostsBefore } from "~/lib/activityCursor";
import { PostCard } from "~/components/PostCard";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { LightBox } from "~/components/LightBox";
import { createMediaGallery } from "~/lib/mediaGallery";
import { tagSearchHref } from "~/lib/tagLinks";

const PAGE_SIZE = 6;
const MAX_EMPTY_PAGES = 4;

const POST_TYPES = [
  PostType.Text,
  PostType.Image,
  PostType.Video,
  PostType.Audio,
  PostType.Link,
  PostType.Chat,
  PostType.Quote,
];

export function BlogHistoricPosts(props: {
  postId: number;
  blogId: number;
  blogName: string;
  createdAtUnix: number;
}) {
  const navigate = useNavigate();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [nextPageToken, setNextPageToken] = createSignal<string | null>(null);
  const gallery = createMediaGallery({ posts: () => posts() });
  let loadedIds = new Set<number>();

  const request = (token: string) =>
    listBlogActivity({
      blog_id: props.blogId,
      blog_name: props.blogName,
      sort_field: SortField.Date,
      order: SortOrder.Descending,
      post_types: POST_TYPES,
      // `like`/`comment` are required for the server's cursor pagination. They
      // add activity clusters to timelineItems, which we filter out below.
      activity_kinds: ["post", "reblog", "like", "comment"],
      page: { page_size: PAGE_SIZE, page_token: token },
      page_size: PAGE_SIZE,
    });

  const pagePosts = (data: ListBlogActivityResponse): Post[] =>
    (data.timelineItems ?? [])
      .filter((item) => item.type === 1 && item.post)
      .map((item) => item.post as Post);

  const fetchPage = (token: string) =>
    request(token).then((data) => {
      if (data.error) throw new Error(data.error);
      return {
        posts: pagePosts(data),
        nextPageToken: data.page?.nextPageToken ?? null,
      };
    });

  const load = async () => {
    if (
      !props.postId ||
      !props.blogId ||
      !props.blogName ||
      !props.createdAtUnix
    ) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setPosts([]);
    setNextPageToken(null);
    loadedIds = new Set();
    try {
      let token: string | null = blogPostsBefore(
        props.createdAtUnix,
        props.postId,
      );
      let collected: Post[] = [];
      let attempts = 0;
      let firstPage = true;
      while (token && attempts < MAX_EMPTY_PAGES) {
        const result = await fetchPage(token);
        if (firstPage) {
          const first = result.posts[0];
          // If the server ignored the synthesized cursor it returns the
          // newest posts. Do not silently present those as the post's period.
          if (
            first &&
            (first.id === props.postId ||
              (first.createdAtUnix ?? 0) > props.createdAtUnix)
          ) {
            throw new Error("Could not load older posts from this blog");
          }
          firstPage = false;
        }
        for (const post of result.posts) {
          if (post.id === props.postId || loadedIds.has(post.id)) continue;
          loadedIds.add(post.id);
          collected.push(post);
        }
        setNextPageToken(result.nextPageToken);
        token = result.nextPageToken;
        attempts += 1;
        if (collected.length > 0) break;
      }
      if (collected.length === 0) {
        setNextPageToken(null);
      }
      setPosts(collected);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load older posts");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.postId;
    props.blogId;
    props.blogName;
    props.createdAtUnix;
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken() || loadingMore()) return;
    setLoadingMore(true);
    setError("");
    try {
      let token: string | null = nextPageToken();
      let collected: Post[] = [];
      let attempts = 0;
      while (token && attempts < MAX_EMPTY_PAGES) {
        const result = await fetchPage(token);
        for (const post of result.posts) {
          if (post.id === props.postId || loadedIds.has(post.id)) continue;
          loadedIds.add(post.id);
          collected.push(post);
        }
        setNextPageToken(result.nextPageToken);
        token = result.nextPageToken;
        attempts += 1;
        if (collected.length > 0) break;
      }
      if (collected.length === 0) {
        setNextPageToken(null);
        return;
      }
      setPosts((prev) => [...prev, ...collected]);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(tagSearchHref(tag));
  };

  return (
    <>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading older posts…</p>}
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<p class="empty">No older posts from this blog.</p>}
        >
          <div class="feed">
            <For each={posts()}>
              {(post) => (
                <PostCard
                  post={post}
                  onTagClick={openTag}
                  onImageClick={(url, postId) =>
                    gallery.open(url, postId)
                  }
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={nextPageToken()}>
        <AutoLoadMore
          onLoad={loadMore}
          loading={loadingMore()}
          ready={!loading()}
          style="display:block;margin:16px auto 0"
          label="Load more posts from this blog"
        />
      </Show>
      <LightBox gallery={gallery} />
    </>
  );
}
