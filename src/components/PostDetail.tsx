import { createSignal, createEffect, For, Show } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { getPostDetail, getBlog, deletePost, PostType, type Post } from "~/lib/api";
import {
  sanitizeHtml,
  processContentHtml,
  getPostMediaUrls,
  getPostMediaItems,
} from "~/lib/sanitize";
import { createMediaGallery } from "~/lib/mediaGallery";
import { ReblogAttribution } from "~/components/ReblogAttribution";
import { BlogAvatar } from "~/components/BlogAvatar";
import { LightBox } from "~/components/LightBox";
import { Comments } from "~/components/Comments";
import { ReblogComposer } from "~/components/ReblogComposer";
import { tagSearchHref } from "~/lib/tagLinks";
import { PostMediaList } from "~/components/PostMediaList";
import { RelatedPosts } from "~/components/RelatedPosts";
import { EngagementModal } from "~/components/EngagementModal";
import {
  HeartIcon,
  ChatIcon,
  ReblogIcon,
  BdsmlrIcon,
  ChartNoAxesColumnIcon,
} from "~/components/Icons";
import { formatRelativeDate } from "~/lib/date";
import { getCachedPost, setCachedPost } from "~/lib/postCache";
import { useAuth } from "~/lib/useAuth";
import { toggleLike, usePostInteraction } from "~/lib/postInteractions";
import { postTypeName } from "~/lib/postTypes";
import { trackEvent } from "~/lib/analytics";

export default function PostDetail(props: {
  postId: number;
  checkBlogGone?: boolean;
  onAuthorKnown?: (blogName: string, blogId: number) => void;
}) {
  const [post, setPost] = createSignal<Post | null>(null);
  const { user } = useAuth();
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [blogGone, setBlogGone] = createSignal(false);
  const [blogCheckDone, setBlogCheckDone] = createSignal(false);
  const gallery = createMediaGallery({
    posts: () => {
      const p = post();
      return p ? [p] : [];
    },
  });
  let trackedPostId: number | null = null;

  createEffect(() => {
    const p = post();
    if (!p || loading() || error()) return;
    if (trackedPostId === p.id) return;
    trackedPostId = p.id;
    trackEvent("post-view", {
      postType: postTypeName(p.type),
      reblog: !!p.originPostId,
    });
  });

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
          onImageClick={(url, postId) => gallery.open(url, postId)}
        />
        <Show when={post()!.id && user()}>
          <RelatedPosts postId={post()!.id} />
        </Show>
      </Show>
      <LightBox gallery={gallery} />
    </>
  );
}

function PostDetailView(props: {
  post: Post;
  blogGone?: boolean;
  onImageClick?: (url: string, postId: number) => void;
}) {
  const { user, activeBlogId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const interaction = usePostInteraction(props.post);
  const [busy, setBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [showReblog, setShowReblog] = createSignal(false);
  const [showEngagement, setShowEngagement] = createSignal(false);
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

  const postTypeLabel = (type?: number) => postTypeName(type);

  const mediaItems = () => getPostMediaItems(props.post);

  const contentHtml = () => {
    const c = props.post.content;
    if (!c?.html) return null;
    const processed =
      props.post.type === PostType.Text
        ? processContentHtml(c.html, getPostMediaUrls(props.post))
        : c.html;
    return sanitizeHtml(processed);
  };

  const handleLike = () => {
    trackEvent("like", {
      surface: "post",
      postType: postTypeName(props.post.type),
      action: interaction().liked ? "unlike" : "like",
    });
    runAction(toggleLike);
  };

  const handleEngagement = () => {
    trackEvent("engagement-open", { kind: "likes-reblogs" });
    setShowEngagement(true);
  };

  const handleTagClick = () => {
    trackEvent("tag-click", { surface: "post" });
  };

  const handleOutbound = () => {
    trackEvent("outbound-bdsmlr", { surface: "post" });
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
              props.onImageClick?.(
                target.getAttribute("src")!,
                props.post.id,
              );
            }
          }}
        />
      )}

      {props.post.type !== PostType.Text && mediaItems().length > 0 && (
        <PostMediaList
          items={mediaItems()}
          class="post-detail-images"
          showAll
          onImageClick={(url) => props.onImageClick?.(url, props.post.id)}
        />
      )}

      {props.post.tags && props.post.tags.length > 0 && (
        <div class="post-detail-tags">
          <For each={props.post.tags}>
            {(t) => (
              <A href={tagSearchHref(t)} class="tag" onClick={handleTagClick}>
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
            onClick={handleLike}
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
        <Show when={user() && props.post.id}>
          <button
            type="button"
            class="download-btn"
            onClick={handleEngagement}
            title="Likes and reblogs"
            aria-label="View likes and reblogs"
          >
            <ChartNoAxesColumnIcon />
          </button>
        </Show>
        <Show when={props.post.id}>
          <a
            href={`https://bdsmlr.com/post/${props.post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            class="download-btn"
            title="Open on BDSMLR"
            onClick={handleOutbound}
          >
            <BdsmlrIcon />
          </a>
        </Show>
        <Show when={ownsPost()}>
          <A
            href={`/compose?post=${props.post.id}`}
            class="download-btn post-meta-action"
          >
            Edit
          </A>
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
      <Show when={showReblog()}>
        <ReblogComposer
          post={props.post}
          onClose={() => setShowReblog(false)}
        />
      </Show>
      <Show when={props.post.id && user()}>
        <Comments
          postId={props.post.id}
          initialCount={props.post.commentsCount ?? 0}
          onCountChange={setCommentsCount}
        />
      </Show>
      <Show when={!user()}>
        <p class="post-guest-note">
          <A href={`/login?next=${encodeURIComponent(location.pathname)}`}>
            Sign in
          </A>{" "}
          to like, reblog, or comment.
        </p>
      </Show>
      <Show when={showEngagement()}>
        <EngagementModal
          postId={props.post.id}
          onClose={() => setShowEngagement(false)}
        />
      </Show>
    </article>
  );
}
