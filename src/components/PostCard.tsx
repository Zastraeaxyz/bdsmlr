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
import { PostMediaList } from "~/components/PostMediaList";
import {
  filterRepeatingMediaItems,
  stripRepeatingImagesFromHtml,
} from "~/lib/repeatingImages";
import { useAuth } from "~/lib/useAuth";
import { toggleLike, usePostInteraction } from "~/lib/postInteractions";
import { postTypeName } from "~/lib/postTypes";
import { surfaceForPath, trackEvent } from "~/lib/analytics";

const NO_HIDDEN_IMAGES: ReadonlySet<string> = new Set();

export interface PostCardProps {
  post: Post;
  hiddenImageIdentities?: ReadonlySet<string>;
  onTagClick?: (tag: string) => void;
  onImageClick?: (url: string) => void;
  tagHref?: (tag: string) => string;
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

  const postTypeLabel = (type?: number) => postTypeName(type);

  const surface = () =>
    typeof window === "undefined"
      ? "post"
      : surfaceForPath(window.location.pathname);

  const handleLike = () => {
    trackEvent("like", {
      surface: surface(),
      postType: postTypeName(post.type),
      action: interaction().liked ? "unlike" : "like",
    });
    runAction(toggleLike);
  };

  const handleCommentsOpen = () => {
    trackEvent("comments-open", {
      surface: surface(),
      postType: postTypeName(post.type),
    });
    setShowComments(true);
  };

  const handleTagClick = (tag: string) => {
    trackEvent("tag-click", { surface: surface() });
    props.onTagClick?.(tag);
  };

  const handlePermalink = () => {
    trackEvent("post-open", {
      surface: surface(),
      postType: postTypeName(post.type),
    });
  };

  const handleOutbound = () => {
    trackEvent("outbound-bdsmlr", { surface: surface() });
  };

  const hiddenImageIdentities = () =>
    props.hiddenImageIdentities ?? NO_HIDDEN_IMAGES;

  const mediaItems = () =>
    filterRepeatingMediaItems(
      getPostMediaItems(post),
      hiddenImageIdentities(),
    );

  const contentHtml = () => {
    const c = post.content;
    if (!c?.html) return null;
    const processed =
      post.type === PostType.Text
        ? processContentHtml(c.html, getPostMediaUrls(post))
        : c.html;
    return stripRepeatingImagesFromHtml(
      sanitizeHtml(processed),
      hiddenImageIdentities(),
    );
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
        <PostMediaList
          items={mediaItems()}
          class="feed-card-images"
          onImageClick={props.onImageClick}
        />
      )}
      {post.tags && post.tags.length > 0 && (
        <div class="feed-card-tags">
          <For each={post.tags}>
            {(t) => (
              <Show
                when={props.onTagClick}
                fallback={<span class="tag">#{t}</span>}
              >
                <Show
                  when={props.tagHref}
                  fallback={
                    <button
                      type="button"
                      class="tag"
                      onClick={() => handleTagClick(t)}
                    >
                      #{t}
                    </button>
                  }
                >
                  <a
                    href={props.tagHref!(t)}
                    class="tag"
                    onClick={(e) => {
                      if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey ||
                        e.button !== 0
                      ) {
                        return;
                      }
                      e.preventDefault();
                      handleTagClick(t);
                    }}
                  >
                    #{t}
                  </a>
                </Show>
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
            onClick={handleLike}
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
            onClick={handleCommentsOpen}
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
            onClick={handleOutbound}
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
            onClick={handlePermalink}
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
