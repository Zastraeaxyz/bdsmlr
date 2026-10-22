import { createEffect, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import {
  blogFollowGraph,
  listBlogFamilyBlogs,
  resolveIdentifier,
  type FollowEdge,
} from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { setCachedFollowingIds } from "~/lib/following";

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
      if (
        props.kind === "following" &&
        activeBlogId() === resolved.blogId
      ) {
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
    <main>
      <h2 class="social-list-title">
        {title()}
        {!loading() ? ` (${items().length})` : ""}
      </h2>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading…</p>}
      <Show when={!loading()}>
        <Show when={items().length > 0} fallback={<p class="empty">{empty()}</p>}>
          <div class="following-list">
            <For each={items()}>
              {(item) => (
                <A href={`/${item.blogName}`} class="following-item">
                  <div class="following-item-avatar-wrap">
                    <Show
                      when={item.avatarUrl}
                      fallback={
                        <span class="following-item-avatar-placeholder">
                          {(item.title || item.blogName || "?")[0]}
                        </span>
                      }
                    >
                      <img
                        class="following-item-avatar"
                        src={item.avatarUrl}
                        alt=""
                      />
                    </Show>
                  </div>
                  <div class="following-item-body">
                    <span class="following-item-name">
                      {item.title || item.blogName}
                    </span>
                    <Show when={item.description}>
                      <span class="following-item-desc">{item.description}</span>
                    </Show>
                  </div>
                  <Show
                    when={
                      activeBlog() &&
                      item.blogId === activeBlogId()
                    }
                  >
                    <span class="following-item-you">You</span>
                  </Show>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </main>
  );
}
