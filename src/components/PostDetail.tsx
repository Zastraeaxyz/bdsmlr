import { createSignal, createEffect, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { getPostDetail, getBlog, PostType, type Post } from "~/lib/api";
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
import {
  HeartIcon,
  ChatIcon,
  ReblogIcon,
  BdsmlrIcon,
} from "~/components/Icons";
import { formatRelativeDate } from "~/lib/date";

export default function PostDetail(props: {
  postId: number;
  checkBlogGone?: boolean;
}) {
  const [post, setPost] = createSignal<Post | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [blogGone, setBlogGone] = createSignal(false);
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);

  createEffect(() => {
    const postId = Number(props.postId);
    if (!postId) {
      setError("Invalid post ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setBlogGone(false);
    getPostDetail(postId)
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const p = data.post ?? null;
        setPost(p);
        if (props.checkBlogGone && p?.blogId) {
          getBlog(p.blogId)
            .then((res) => {
              if (res.error === "blog gone") setBlogGone(true);
            })
            .catch((err: unknown) => {
              if ((err as Error)?.message === "blog gone") setBlogGone(true);
            });
        }
      })
      .catch((err: unknown) =>
        setError((err as Error)?.message || "Failed to load post"),
      )
      .finally(() => setLoading(false));
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
    <article class="post-detail">
      <div class="post-detail-header">
        <BlogAvatar
          blogId={props.post.blogId}
          blogName={props.post.blogName}
          size={32}
          linkable={!props.blogGone}
        />
        <Show
          when={!props.blogGone}
          fallback={<span class="post-detail-blog">{props.post.blogName}</span>}
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
            {(t) => <span class="tag">#{t}</span>}
          </For>
        </div>
      )}

      <div class="post-detail-meta">
        <span>
          <HeartIcon /> {props.post.likesCount ?? 0}
        </span>
        <span>
          <ChatIcon /> {props.post.commentsCount ?? 0}
        </span>
        <span>
          <ReblogIcon /> {props.post.reblogsCount ?? 0}
        </span>
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
      </div>
    </article>
  );
}
