import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A } from "@solidjs/router";
import {
  blogFollowGraph,
  listBlogFamilyBlogs,
  resolveIdentifier,
  type FollowEdge,
} from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { setCachedFollowingIds } from "~/lib/following";
import { Alert, AlertDescription } from "./ui/alert";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { EmptyState } from "./FeedStates";

export type SocialKind = "following" | "followers" | "siblings";

interface SocialItem {
  blogId: number;
  blogName: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
}

function normalizeEdge(edge: FollowEdge): SocialItem {
  return {
    blogId: Number(edge.blogId),
    blogName: edge.blogName,
    title: edge.title,
    description: edge.description,
    avatarUrl: edge.avatarUrl,
  };
}

export function SocialList(props: { blogName: string; kind: SocialKind }) {
  const { activeBlogId, activeBlog } = useAuth();
  const [items, setItems] = createSignal<SocialItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  const load = async () => {
    const name = props.blogName;
    if (!name) {
      setError("No user specified");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resolved = await resolveIdentifier(name);
      if (!resolved.blogId) {
        setError(resolved.error || "User not found");
        return;
      }

      if (props.kind === "siblings") {
        const data = await listBlogFamilyBlogs(resolved.blogId);
        const siblings = (data.blogs ?? [])
          .filter((blog) => Number(blog.id) !== resolved.blogId)
          .map((blog) => ({
            blogId: Number(blog.id),
            blogName: blog.name,
            title: blog.title,
            description: blog.description,
            avatarUrl: blog.avatarUrl,
          }));
        setItems(siblings);
        return;
      }

      const direction = props.kind === "followers" ? "followers" : "following";
      const all: FollowEdge[] = [];
      let pageToken: string | undefined;
      while (true) {
        const graph = await blogFollowGraph(
          resolved.blogId,
          pageToken,
          direction,
        );
        all.push(...(graph[direction] || []));
        pageToken = graph.nextPageToken;
        if (!pageToken) break;
      }
      const normalized = all.map(normalizeEdge);
      setItems(normalized);
      if (props.kind === "following" && activeBlogId() === resolved.blogId) {
        setCachedFollowingIds(
          normalized.map((item) => item.blogId),
          activeBlogId(),
        );
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || `Failed to load ${props.kind}`);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.blogName;
    props.kind;
    activeBlogId();
    void load();
  });

  const title = () => {
    if (props.kind === "followers") return "Followers";
    if (props.kind === "siblings") return "Other blogs";
    return "Following";
  };

  const empty = () => {
    if (props.kind === "followers") return "No followers yet.";
    if (props.kind === "siblings") return "No other blogs for this user.";
    return "Not following anyone.";
  };

  return (

    <main class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">{title()}</h2>
        <Show when={!loading()}>
          <Badge variant="secondary">{items().length}</Badge>
        </Show>
      </div>

      <Show when={error()}>
        <FeedErrorNotice message={error()} onRetry={() => void load()} />
      </Show>

      <Show when={loading()}>
        <div class="flex flex-col gap-2">
          <For each={[0, 1, 2, 3, 4]}>
            {() => (
              <div class="flex items-center gap-3 rounded-lg border p-3">
                <Skeleton class="size-10 rounded-full" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-3.5 w-32" />
                  <Skeleton class="h-3 w-48" />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>


      <Show when={!loading()}>
        <Show when={items().length > 0} fallback={<EmptyState>{empty()}</EmptyState>}>
          <Card class="divide-y divide-border overflow-hidden bg-card py-0 shadow-none">
            <For each={items()}>
              {(item) => (
                <A
                  href={`/${item.blogName}`}
                  class="flex items-center gap-3 px-3 py-3 hover:bg-accent"
                >
                  <Avatar
                    src={item.avatarUrl}
                    fallback={item.title || item.blogName || "?"}
                    class="size-10"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">
                      {item.title || item.blogName}
                    </p>
                    <p class="truncate text-xs text-muted-foreground">
                      @{item.blogName}
                    </p>
                    <Show when={item.description}>
                      <p class="line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </Show>
                  </div>
                  <Show when={activeBlog() && item.blogId === activeBlogId()}>
                    <Badge variant="secondary">You</Badge>
                  </Show>
                </A>
              )}
            </For>
          </Card>
        </Show>
      </Show>
    </main>
  );
}
