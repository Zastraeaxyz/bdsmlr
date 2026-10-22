import { createSignal, createEffect, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { getPostDetail, getBlog, deletePost, reportPost, PostType, type Post } from "~/lib/api";
import {
  sanitizeHtml,
  processContentHtml,
  getMediaType,
  getPostMediaUrls,
  upgradeToLightbox,
  type MediaType,
} from "~/lib/sanitize";
import { ReblogAttribution } from "~/components/ReblogAttribution";
import { BlogAvatar } from "~/components/BlogAvatar";
import { LightBox } from "~/components/LightBox";
import { AutoLoopVideo } from "~/components/AutoLoopVideo";
import { Comments } from "~/components/Comments";
import { ReblogComposer } from "~/components/ReblogComposer";
import { RelatedPosts } from "~/components/RelatedPosts";
import { EngagementModal } from "~/components/EngagementModal";
import {
  HeartIcon,
  ChatIcon,
  ReblogIcon,
  BdsmlrIcon,
} from "~/components/Icons";
import { formatRelativeDate } from "~/lib/date";
import { getCachedPost, setCachedPost } from "~/lib/postCache";
import { useAuth } from "~/lib/useAuth";
import { toggleLike, usePostInteraction } from "~/lib/postInteractions";

export default function PostDetail(props: {
  postId: number;
  checkBlogGone?: boolean;
  onAuthorKnown?: (blogName: string, blogId: number) => void;
}) {
  const [post, setPost] = createSignal<Post | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [blogGone, setBlogGone] = createSignal(false);
  const [blogCheckDone, setBlogCheckDone] = createSignal(false);
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);

  createEffect(() => {
    const postId = Number(props.postId);
    if (!postId) {
      setError("Invalid post ID");
      setLoading(false);
      setBlogCheckDone(true);
      return;
    }
    setLoading(true);
    setError("");
    setBlogGone(false);
    setBlogCheckDone(false);

    const cached = getCachedPost(postId);
    if (cached) {
      setPost(cached);
      setLoading(false);
    }

    getPostDetail(postId)
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setBlogCheckDone(true);
          return;
        }
        const p = data.post ?? null;
        if (p) {
          setPost(p);
          setCachedPost(p);
        }
        if (props.checkBlogGone && p?.blogId) {
          getBlog(p.blogId)
            .then((res) => {
              if (res.error === "blog gone") setBlogGone(true);
            })
            .catch((err: unknown) => {
              if ((err as Error)?.message === "blog gone") setBlogGone(true);
            })
            .finally(() => setBlogCheckDone(true));
        } else {
          setBlogCheckDone(true);
        }
      })
      .catch((err: unknown) => {
        setError((err as Error)?.message || "Failed to load post");
        setBlogCheckDone(true);
      })
      .finally(() => setLoading(false));
  });

  createEffect(() => {
    if (!props.onAuthorKnown) return;
    const p = post();
    if (!p?.blogName || !p.blogId) return;
    if (!blogCheckDone()) return;
    if (blogGone()) return;
    props.onAuthorKnown(p.blogName, p.blogId);
  });

  return (
    <>
      <Title>
        {post()?.blogName
          ? `${post()!.blogName}'s Post — bbdsmlr`
          : "Post — bbdsmlr"}
      </Title>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading post…</p>}
      <Show when={blogGone()}>
        <p class="post-detail-gone">
          Blog gone — this blog was deleted, but the post remains accessible.
        </p>
      </Show>
      <Show when={!loading() && post()}>
        <PostDetailView
          post={post()!}
          blogGone={blogGone()}
          onImageClick={(url) => setLightboxUrl(upgradeToLightbox(url))}
        />
      </Show>
      <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
    </>
  );
}

function PostDetailView(props: {
  post: Post;
  blogGone?: boolean;
  onImageClick?: (url: string) => void;
}) {
  const { user, activeBlogId } = useAuth();
  const navigate = useNavigate();
  const interaction = usePostInteraction(props.post);
  const [busy, setBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [showReblog, setShowReblog] = createSignal(false);
  const [showLikes, setShowLikes] = createSignal(false);
  const [showReblogs, setShowReblogs] = createSignal(false);
  const [commentsCount, setCommentsCount] = createSignal(
    props.post.commentsCount ?? 0,
  );

  const ownsPost = () =>
    !!activeBlogId() &&
    Number(props.post.blogId) === Number(activeBlogId());

  const handleDelete = async () => {
    const actor = activeBlogId();
    if (!actor || !ownsPost()) return;
    if (!window.confirm(`Delete post ${props.post.id}?`)) return;
    setActionError("");
    setNotice("");
    try {
      const res = await deletePost(actor, props.post.id);
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || "Could not delete post");
      }
      navigate(props.post.blogName ? `/${props.post.blogName}` : "/");
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "Could not delete post");
    }
  };

  const handleReport = async () => {
    const actor = activeBlogId();
    if (!actor) return;
    if (!window.confirm(`Report post ${props.post.id}?`)) return;
    setActionError("");
    setNotice("");
    try {
      const res = await reportPost(actor, props.post.id);
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || "Could not report post");
      }
      setNotice("Report submitted. Thank you.");
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "Could not report post");
    }
  };

  const runAction = async (action: (post: Post) => Promise<void>) => {
    if (busy()) return;
    setBusy(true);
    setActionError("");
    try {
      await action(props.post);
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

  const mediaItems = (): { url: string; type: MediaType }[] => {
    return getPostMediaUrls(props.post).map((url) => ({ url, type: getMediaType(url) }));
  };

  const contentHtml = () => {
    const c = props.post.content;
    if (!c?.html) return null;
    const processed =
      props.post.type === PostType.Text
        ? processContentHtml(c.html, getPostMediaUrls(props.post))
        : c.html;
    return sanitizeHtml(processed);
  };

  return (
    <article class="post-detail" style="view-transition-name: post-detail">
      <div class="post-detail-header">
        <BlogAvatar
          blogId={props.post.blogId}
          blogName={props.post.blogName}
          size={32}
          linkable={!props.blogGone}
        />
        <Show
          when={!props.blogGone}
          fallback={
            <span class="post-detail-blog post-detail-blog-gone">
              {props.post.blogName}
            </span>
          }
        >
          <A href={`/${props.post.blogName}`} class="post-detail-blog">
            {props.post.blogName}
          </A>
        </Show>
        <span class="feed-card-type">{postTypeLabel(props.post.type)}</span>
        <Show when={props.blogGone}>
          <span class="feed-card-type blog-gone-chip">Blog gone</span>
        </Show>
        <Show when={!props.post.id}>
          <span class="feed-card-type">DELETED</span>
        </Show>
        {props.post.createdAtUnix && (
          <span class="post-detail-time">
            {formatRelativeDate(props.post.createdAtUnix)}
          </span>
        )}
      </div>

      <ReblogAttribution
        originBlogName={props.post.originBlogName}
        originPostId={props.post.originPostId}
        variant={props.post.variant}
      />

      {props.post.title && (
        <h2 class="post-detail-title">{props.post.title}</h2>
      )}
      {contentHtml() && (
        <div
          class="post-detail-body"
          innerHTML={contentHtml()!}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "IMG" && target.getAttribute("src")) {
              props.onImageClick?.(target.getAttribute("src")!);
            }
          }}
        />
      )}

      {props.post.type !== PostType.Text && mediaItems().length > 0 && (
        <div class="post-detail-images">
          <For each={mediaItems()}>
            {(item) => (
              <Show
                when={item.type === "image"}
                fallback={<AutoLoopVideo src={item.url} />}
              >
                <img
                  src={item.url}
                  alt=""
                  onClick={() => props.onImageClick?.(item.url)}
                />
              </Show>
            )}
          </For>
        </div>
      )}

      {props.post.tags && props.post.tags.length > 0 && (
        <div class="post-detail-tags">
          <For each={props.post.tags}>
            {(t) => (
              <A href={`/tag/${encodeURIComponent(t)}`} class="tag">
                #{t}
              </A>
            )}
          </For>
        </div>
      )}

      <div class="post-detail-meta">
        <Show
          when={user() && props.post.id}
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
        <span>
          <ChatIcon /> {commentsCount()}
        </span>
        <Show
          when={user() && props.post.id}
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
        <Show when={props.post.id}>
          <a
            href={`https://bdsmlr.com/post/${props.post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            class="download-btn"
            title="Open on BDSMLR"
          >
            <BdsmlrIcon />
          </a>
        </Show>
        <Show when={user() && props.post.id && !ownsPost()}>
          <button
            type="button"
            class="download-btn post-meta-action"
            onClick={handleReport}
          >
            Report
          </button>
        </Show>
        <Show when={ownsPost()}>
          <button
            type="button"
            class="download-btn post-meta-action danger-text"
            onClick={handleDelete}
          >
            Delete
          </button>
        </Show>
      </div>
      <Show when={actionError()}>
        <p class="action-error">{actionError()}</p>
      </Show>
      <Show when={notice()}>
        <p class="action-notice">{notice()}</p>
      </Show>
      <div class="post-engagement-links">
        <button
          type="button"
          class="engagement-link"
          onClick={() => setShowLikes(true)}
        >
          Liked by {interaction().likesCount}
        </button>
        <button
          type="button"
          class="engagement-link"
          onClick={() => setShowReblogs(true)}
        >
          Reblogged by {interaction().reblogsCount}
        </button>
      </div>
      <Show when={showReblog()}>
        <ReblogComposer
          post={props.post}
          onClose={() => setShowReblog(false)}
        />
      </Show>
      <Show when={props.post.id}>
        <Comments
          postId={props.post.id}
          initialCount={props.post.commentsCount ?? 0}
          onCountChange={setCommentsCount}
        />
      </Show>
      <Show when={props.post.id}>
        <RelatedPosts postId={props.post.id} />
      </Show>
      <Show when={showLikes()}>
        <EngagementModal
          postId={props.post.id}
          kind="likes"
          onClose={() => setShowLikes(false)}
        />
      </Show>
      <Show when={showReblogs()}>
        <EngagementModal
          postId={props.post.id}
          kind="reblogs"
          onClose={() => setShowReblogs(false)}
        />
      </Show>
    </article>
  );
}
