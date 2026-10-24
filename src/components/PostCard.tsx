import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { PostType, type Post } from "~/lib/api";
import {
  sanitizeHtml,
  processContentHtml,
  getPostMediaUrls,
  getPostMediaItems,
} from "~/lib/sanitize";
import { ReblogAttribution } from "~/components/ReblogAttribution";
import { BlogAvatar } from "~/components/BlogAvatar";
import {
  HeartIcon,
  ChatIcon,
  ReblogIcon,
  BdsmlrIcon,
} from "~/components/Icons";
import { formatRelativeDate } from "~/lib/date";
import { Comments } from "~/components/Comments";
import { ReblogComposer } from "~/components/ReblogComposer";
import { PostMedia } from "~/components/PostMedia";
import { useAuth } from "~/lib/useAuth";
import { toggleLike, usePostInteraction } from "~/lib/postInteractions";

export interface PostCardProps {
  post: Post;
  onTagClick?: (tag: string) => void;
  onImageClick?: (url: string) => void;
}

export function PostCard(props: PostCardProps) {
  const post = props.post;
  const { user } = useAuth();
  const interaction = usePostInteraction(post);
  const [busy, setBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal("");
  const [showComments, setShowComments] = createSignal(false);
  const [showReblog, setShowReblog] = createSignal(false);
  const [commentsCount, setCommentsCount] = createSignal(
    post.commentsCount ?? 0,
  );

  const runAction = async (action: (post: Post) => Promise<void>) => {
    if (busy()) return;
    setBusy(true);
    setActionError("");
    try {
      await action(post);
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const postTypeLabel = (type?: number) => {
    switch (type) {
      case 0:
        return "General";
      case 1:
        return "Text";
      case 2:
        return "Image";
      case 3:
        return "Video";
      case 4:
        return "Audio";
      case 5:
        return "Link";
      case 6:
        return "Poll";
      case 7:
        return "Quote";
      default:
        return "Post";
    }
  };

  const mediaItems = () => getPostMediaItems(post);

  const contentHtml = () => {
    const c = post.content;
    if (!c?.html) return null;
    const processed =
      post.type === PostType.Text
        ? processContentHtml(c.html, getPostMediaUrls(post))
        : c.html;
    return sanitizeHtml(processed);
  };

  return (
    <div class="feed-card">
      <div class="feed-card-header">
        <BlogAvatar blogId={post.blogId} blogName={post.blogName} />
        <A href={`/${post.blogName}`} class="feed-card-blog">
          {post.blogName}
        </A>
        <span class="feed-card-type">{postTypeLabel(post.type)}</span>
        <Show when={!post.id}>
          <span class="feed-card-type">DELETED</span>
        </Show>
        {post.createdAtUnix && (
          <span class="feed-card-time">
            {formatRelativeDate(post.createdAtUnix)}
          </span>
        )}
      </div>
      <ReblogAttribution
        originBlogName={post.originBlogName}
        originPostId={post.originPostId}
        variant={post.variant}
      />
      {post.title && <div class="feed-card-title">{post.title}</div>}
      {contentHtml() && (
        <div
          class="feed-card-body"
          innerHTML={contentHtml()!}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "IMG" && target.getAttribute("src")) {
              props.onImageClick?.(target.getAttribute("src")!);
            }
          }}
        />
      )}
      {post.type !== PostType.Text && mediaItems().length > 0 && (
        <div class="feed-card-images">
          <For each={mediaItems()}>
            {(item) => (
              <PostMedia
                item={item}
                onImageClick={(url) => props.onImageClick?.(url)}
              />
            )}
          </For>
        </div>
      )}
      {post.tags && post.tags.length > 0 && (
        <div class="feed-card-tags">
          <For each={post.tags}>
            {(t) => (
              <Show
                when={props.onTagClick}
                fallback={<span class="tag">#{t}</span>}
              >
                <button
                  type="button"
                  class="tag"
                  onClick={() => props.onTagClick?.(t)}
                >
                  #{t}
                </button>
              </Show>
            )}
          </For>
        </div>
      )}
      <div class="feed-card-meta">
        <Show
          when={user() && post.id}
          fallback={
            <span>
              <HeartIcon class={interaction().liked ? "icon heart-filled" : "icon"} /> {interaction().likesCount}
            </span>
          }
        >
          <button
            type="button"
            class={interaction().liked ? "post-action active" : "post-action"}
            onClick={() => runAction(toggleLike)}
            disabled={busy()}
            title={interaction().liked ? "Unlike" : "Like"}
            aria-label={interaction().liked ? "Unlike post" : "Like post"}
            aria-pressed={interaction().liked}
          >
            <HeartIcon class={interaction().liked ? "icon heart-filled" : "icon"} /> {interaction().likesCount}
          </button>
        </Show>
        <Show
          when={post.id}
          fallback={
            <span>
              <ChatIcon /> {commentsCount()}
            </span>
          }
        >
          <button
            type="button"
            class="post-action"
            onClick={() => setShowComments(true)}
            title="View comments"
            aria-label={`View ${commentsCount()} comments`}
          >
            <ChatIcon /> {commentsCount()}
          </button>
        </Show>
        <Show
          when={user() && post.id}
          fallback={
            <span>
              <ReblogIcon /> {interaction().reblogsCount}
            </span>
          }
        >
          <button
            type="button"
            class={
              interaction().reblogged ? "post-action active" : "post-action"
            }
            onClick={() => setShowReblog(true)}
            disabled={busy()}
            title={interaction().reblogged ? "Reblog again" : "Reblog"}
            aria-label={
              interaction().reblogged ? "Reblog post again" : "Reblog post"
            }
          >
            <ReblogIcon /> {interaction().reblogsCount}
          </button>
        </Show>
        <Show when={post.id}>
          <a
            href={`https://bdsmlr.com/post/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            class="download-btn"
            title="Open on BDSMLR"
          >
            <BdsmlrIcon />
          </a>
        </Show>
        <Show when={post.id}>
          <A
            href={
              post.blogName
                ? `/${post.blogName}/post/${post.id}`
                : `/post/${post.id}`
            }
            class="feed-card-permalink"
          >
            Permalink
          </A>
        </Show>
      </div>
      <Show when={actionError()}>
        <p class="action-error">{actionError()}</p>
      </Show>
      <Show when={showReblog()}>
        <ReblogComposer
          post={post}
          onClose={() => setShowReblog(false)}
        />
      </Show>
      <Show when={showComments()}>
        <div
          class="tag-modal-backdrop"
          onClick={() => setShowComments(false)}
        >
          <div
            class="tag-modal comments-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              class="tag-modal-close"
              onClick={() => setShowComments(false)}
              aria-label="Close comments"
            >
              ×
            </button>
            <Comments
              postId={post.id}
              initialCount={post.commentsCount ?? 0}
              onCountChange={setCommentsCount}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}
