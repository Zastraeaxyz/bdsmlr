import { createSignal, createEffect, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Heart,
  MessageCircle,
  Pencil,
  Repeat2,
  Trash2,
} from "lucide-solid";
import {
  getPostDetail,
  getBlog,
  deletePost,
  PostType,
  type Post,
} from "~/lib/api";
import {
  sanitizeHtml,
  processContentHtml,
  getPostMediaUrls,
  getPostMediaItems,
} from "~/lib/sanitize";
import { rewriteBdsmlrLinks } from "~/lib/contentLinks";
import { createMediaGallery } from "~/lib/mediaGallery";
import { ReblogAttribution } from "~/components/ReblogAttribution";
import { BlogAvatar } from "~/components/BlogAvatar";
import { BdsmlrIcon } from "~/components/Icons";
import { LightBox } from "~/components/LightBox";
import { Comments } from "~/components/Comments";
import { ReblogComposer } from "~/components/ReblogComposer";
import { tagSearchHref } from "~/lib/tagLinks";
import { PostMediaList } from "~/components/PostMediaList";
import { PostMoreTabs } from "~/components/PostMoreTabs";
import { EngagementModal } from "~/components/EngagementModal";
import { formatRelativeDate } from "~/lib/date";
import { getCachedPost, setCachedPost } from "~/lib/postCache";
import { useAuth } from "~/lib/useAuth";
import { toggleLike, usePostInteraction } from "~/lib/postInteractions";
import { postTypeName } from "~/lib/postTypes";
import { trackEvent } from "~/lib/analytics";
import { isDeletedPostError } from "~/lib/requestError";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export default function PostDetail(props: {
  postId: number;
  checkBlogGone?: boolean;
  onAuthorKnown?: (blogName: string, blogId: number) => void;
  backHref?: string;
  backLabel?: string;
}) {
  const [post, setPost] = createSignal<Post | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [deleted, setDeleted] = createSignal(false);
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
    setDeleted(false);
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
        if (isDeletedPostError(err)) {
          setDeleted(true);
          setPost(null);
        } else {
          setError((err as Error)?.message || "Failed to load post");
        }
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

      <div class="mx-auto w-full max-w-2xl flex-1 px-0 py-0 sm:px-4 sm:py-4">
        <Show when={error()}>
          <div class="p-4">
            <FeedErrorNotice message={error()} />
          </div>
        </Show>

        <Show when={deleted()}>
          <div class="px-3 pt-3 sm:px-0">
            <Alert variant="warning" role="status">
              <AlertTriangle class="size-4" />
              <AlertTitle>This post was deleted.</AlertTitle>
              <AlertDescription class="flex flex-col items-start gap-3">
                <span>
                  The author deleted it, or BDSMLR removed it, so there is
                  nothing left to show.
                </span>
                <Button as={A} href={props.backHref ?? "/home"} size="sm">
                  {props.backLabel ?? "Back to home"}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </Show>

        <Show when={loading() && !post()}>
          <div class="p-3">
            <Card class="gap-3 bg-card p-4">
              <div class="flex items-center gap-2">
                <Skeleton class="size-9 rounded-full" />
                <Skeleton class="h-4 w-40" />
              </div>
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="aspect-[4/3] w-full rounded-lg" />
            </Card>
          </div>
        </Show>

        <Show when={blogGone()}>
          <div class="px-3 pt-3 sm:px-0">
            <Alert variant="warning">
              <AlertTitle>Blog gone</AlertTitle>
              <AlertDescription>
                This blog was deleted, but the post remains accessible.
              </AlertDescription>
            </Alert>
          </div>
        </Show>

        <Show when={post()}>
          <PostDetailView
            post={post()!}
            blogGone={blogGone()}
            onImageClick={(url, postId) => gallery.open(url, postId)}
          />
          <Show when={post()!.id}>
            <div class="px-3 sm:px-0">
              <PostMoreTabs post={post()!} />
            </div>
          </Show>
        </Show>
      </div>
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
  const navigate = useNavigate();
  const interaction = usePostInteraction(props.post);
  const [busy, setBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal("");
  const [showReblog, setShowReblog] = createSignal(false);
  const [showEngagement, setShowEngagement] = createSignal(false);
  const [commentsCount, setCommentsCount] = createSignal(
    props.post.commentsCount ?? 0,
  );

  const ownsPost = () =>
    !!activeBlogId() && Number(props.post.blogId) === Number(activeBlogId());

  const handleDelete = async () => {
    const actor = activeBlogId();
    if (!actor || !ownsPost()) return;
    if (!window.confirm(`Delete post ${props.post.id}?`)) return;
    setActionError("");
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

  const mediaItems = () => getPostMediaItems(props.post);

  const contentHtml = () => {
    const c = props.post.content;
    if (!c?.html) return null;
    const processed =
      props.post.type === PostType.Text
        ? processContentHtml(c.html, getPostMediaUrls(props.post))
        : c.html;
    return rewriteBdsmlrLinks(sanitizeHtml(processed));
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

  return (
    <article
      class="w-full"
      style="view-transition-name: post-detail"
    >
      <Card class="gap-0 overflow-hidden rounded-none border-x-0 bg-card py-0 shadow-none sm:rounded-xl sm:border-x">
        <div class="flex items-center gap-2 px-3 py-3">
          <BlogAvatar
            blogId={props.post.blogId}
            blogName={props.post.blogName}
            size={36}
            linkable={!props.blogGone}
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <Show
                when={!props.blogGone}
                fallback={
                  <span class="truncate text-sm font-semibold">
                    {props.post.blogName}
                  </span>
                }
              >
                <A
                  href={`/${props.post.blogName}`}
                  class="truncate text-sm font-semibold hover:underline"
                >
                  {props.post.blogName}
                </A>
              </Show>
              <Badge variant="secondary" class="text-[10px]">
                {postTypeName(props.post.type)}
              </Badge>
              <Show when={props.blogGone}>
                <Badge variant="outline" class="text-[10px]">
                  Blog gone
                </Badge>
              </Show>
              <Show when={!props.post.id}>
                <Badge variant="destructive" class="text-[10px]">
                  DELETED
                </Badge>
              </Show>
            </div>
            <Show when={props.post.createdAtUnix}>
              <p class="text-xs text-muted-foreground">
                {formatRelativeDate(props.post.createdAtUnix!)}
              </p>
            </Show>
          </div>
          <Show when={props.post.id}>
            <Button
              as="a"
              href={`https://bdsmlr.com/post/${props.post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="icon"
              class="size-9 text-muted-foreground"
              aria-label="Open on BDSMLR"
              onClick={() => trackEvent("outbound-bdsmlr", { surface: "post" })}
            >
              <BdsmlrIcon class="size-4" />
            </Button>
          </Show>
        </div>

        <div class="px-3">
          <ReblogAttribution
            originBlogName={props.post.originBlogName}
            originPostId={props.post.originPostId}
            variant={props.post.variant}
          />
        </div>

        <Show when={props.post.title?.trim()}>
          <h1 class="px-3 pb-2 text-xl font-semibold leading-snug">
            {props.post.title!.trim()}
          </h1>
        </Show>

        <Show when={contentHtml()}>
          <div
            class="post-content px-3 pb-3"
            innerHTML={contentHtml()!}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.tagName === "IMG" && target.getAttribute("src")) {
                props.onImageClick?.(
                  target.getAttribute("src")!,
                  props.post.id,
                );
              }
            }}
          />
        </Show>

        <Show when={props.post.type !== PostType.Text && mediaItems().length > 0}>
          <PostMediaList
            items={mediaItems()}
            showAll
            onImageClick={(url) => props.onImageClick?.(url, props.post.id)}
          />
        </Show>

        <Show when={props.post.tags && props.post.tags.length > 0}>
          <div class="flex flex-wrap gap-1.5 px-3 py-3">
            <For each={props.post.tags}>
              {(tag) => (
                <A
                  href={tagSearchHref(
                    tag,
                    props.blogGone ? undefined : props.post.blogName,
                  )}
                  class="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => trackEvent("tag-click", { surface: "post" })}
                >
                  #{tag}
                </A>
              )}
            </For>
          </div>
        </Show>

        <div class="flex flex-wrap items-center gap-1 border-t border-border px-2 py-2">
          <Show
            when={user() && props.post.id}
            fallback={
              <span class="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground">
                <Heart class="size-4" /> {interaction().likesCount}
              </span>
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-9 gap-1.5 px-2"
              classList={{ "text-rose-400": interaction().liked }}
              onClick={handleLike}
              disabled={busy()}
              title={interaction().liked ? "Unlike" : "Like"}
              aria-label={interaction().liked ? "Unlike post" : "Like post"}
              aria-pressed={interaction().liked}
            >
              <Heart
                class="size-4"
                fill={interaction().liked ? "currentColor" : "none"}
              />
              {interaction().likesCount}
            </Button>
          </Show>

          <span class="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground">
            <MessageCircle class="size-4" /> {commentsCount()}
          </span>

          <Show
            when={user() && props.post.id}
            fallback={
              <span class="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground">
                <Repeat2 class="size-4" /> {interaction().reblogsCount}
              </span>
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-9 gap-1.5 px-2"
              classList={{ "text-emerald-400": interaction().reblogged }}
              onClick={() => setShowReblog(true)}
              disabled={busy()}
              title={interaction().reblogged ? "Reblog again" : "Reblog"}
              aria-label={
                interaction().reblogged ? "Reblog post again" : "Reblog post"
              }
            >
              <Repeat2 class="size-4" />
              {interaction().reblogsCount}
            </Button>
          </Show>

          <Show when={props.post.id}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-9 gap-1.5 px-2"
              onClick={handleEngagement}
              title="Likes and reblogs"
              aria-label="View likes and reblogs"
            >
              <BarChart3 class="size-4" />
            </Button>
          </Show>

          <Show when={ownsPost()}>
            <div class="ml-auto flex items-center gap-1">
              <Button
                as={A}
                href={`/compose?post=${props.post.id}`}
                variant="ghost"
                size="sm"
                class="h-9 gap-1.5"
              >
                <Pencil class="size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-9 gap-1.5 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 class="size-4" />
                Delete
              </Button>
            </div>
          </Show>
        </div>

        <Show when={actionError()}>
          <div class="px-3 pb-3">
            <Alert variant="destructive">
              <AlertDescription>{actionError()}</AlertDescription>
            </Alert>
          </div>
        </Show>
      </Card>

      <div class="px-3 py-4 sm:px-0">
        <Show when={props.post.id}>
          <Comments
            postId={props.post.id}
            initialCount={props.post.commentsCount ?? 0}
            onCountChange={setCommentsCount}
          />
        </Show>
      </div>

      <Show when={showReblog()}>
        <ReblogComposer
          post={props.post}
          onClose={() => setShowReblog(false)}
        />
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
