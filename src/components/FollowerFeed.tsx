import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { useNavigate } from "@solidjs/router";
import {
  listBlogsRecentActivity,
  resolveIdentifier,
  type Post,
} from "~/lib/api";
import { fetchAllFollowerIds } from "~/lib/following";
import { PostFeed } from "~/components/PostFeed";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Alert, AlertDescription } from "./ui/alert";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { LightBox } from "~/components/LightBox";
import { createMediaGallery } from "~/lib/mediaGallery";
import { tagSearchHref } from "~/lib/tagLinks";

const PAGE_SIZE = 20;

export function FollowerFeed(props: { blogName: string }) {
  const navigate = useNavigate();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const gallery = createMediaGallery({ posts: () => posts() });
  let followerIds: number[] = [];
  let nextPageToken: string | null = null;

  const load = async () => {
    setLoading(true);
    setError("");
    setPosts([]);
    nextPageToken = null;
    try {
      const resolved = await resolveIdentifier(props.blogName);
      if (!resolved.blogId) {
        setError(resolved.error || "Blog not found");
        return;
      }
      followerIds = await fetchAllFollowerIds(resolved.blogId);
      if (followerIds.length === 0) {
        setPosts([]);
        return;
      }
      const data = await listBlogsRecentActivity(followerIds, PAGE_SIZE);
      const incoming = data.posts ?? [];
      setPosts(incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load follower feed");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.blogName;
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      const data = await listBlogsRecentActivity(
        followerIds,
        PAGE_SIZE,
        token,
      );
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(tagSearchHref(tag));
  };

  return (
    <div>
<Show when={error()}>
        <FeedErrorNotice message={error()} />
      </Show>
      <Show when={loading()}>
        <FeedSkeleton />
      </Show>
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<EmptyState>No posts from this blog's followers.</EmptyState>}
        >
          <PostFeed
            posts={posts()}
            onTagClick={openTag}
            onImageClick={(url, postId) => gallery.open(url, postId)}
          />
        </Show>
      </Show>
      <Show when={nextPageToken}>
        <AutoLoadMore onLoad={loadMore} loading={loadingMore()} />
      </Show>
      <LightBox gallery={gallery} />
    </div>
  );
}
