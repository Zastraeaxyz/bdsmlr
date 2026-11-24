import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
} from "lucide-solid";
import { PostType, type Post } from "~/lib/api";
import {
  sanitizeHtml,
  processContentHtml,
  getPostMediaUrls,
  getPostMediaItems,
} from "~/lib/sanitize";
import { rewriteBdsmlrLinks } from "~/lib/contentLinks";
import { ReblogAttribution } from "~/components/ReblogAttribution";
import { BlogAvatar } from "~/components/BlogAvatar";
import { BdsmlrIcon } from "~/components/Icons";
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
import { sheetDialogClass } from "~/lib/ui";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";

const NO_HIDDEN_IMAGES: ReadonlySet<string> = new Set();

export interface PostCardProps {
  post: Post;
  hiddenImageIdentities?: ReadonlySet<string>;
  onTagClick?: (tag: string) => void;
  onImageClick?: (url: string, postId: number) => void;
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
    return rewriteBdsmlrLinks(
      stripRepeatingImagesFromHtml(
        sanitizeHtml(processed),
        hiddenImageIdentities(),
      ),
    );
  };

  return (
    <Card class="gap-0 overflow-hidden rounded-none border-x-0 bg-card py-0 shadow-none sm:rounded-xl sm:border-x">
      <div class="flex items-center gap-2 px-3 py-3">
        <BlogAvatar blogId={post.blogId} blogName={post.blogName} size={34} />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <A
              href={`/${post.blogName}`}
              class="truncate text-sm font-semibold hover:underline"
            >
              {post.blogName}
            </A>
            <Badge variant="secondary" class="shrink-0 text-[10px]">
              {postTypeName(post.type)}
            </Badge>
            <Show when={!post.id}>
              <Badge variant="destructive" class="shrink-0 text-[10px]">
                DELETED
              </Badge>
            </Show>
          </div>
          <Show when={post.createdAtUnix}>
            <p class="text-xs text-muted-foreground">
              {formatRelativeDate(post.createdAtUnix!)}
            </p>
          </Show>
        </div>
        <Show when={post.id}>
          <Button
            as="a"
            href={`https://bdsmlr.com/post/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="icon"
            class="size-9 text-muted-foreground"
            aria-label="Open on BDSMLR"
            onClick={handleOutbound}
          >
            <BdsmlrIcon class="size-4" />
          </Button>
        </Show>
        <Show when={post.id}>
          <Button
            as={A}
            href={
              post.blogName
                ? `/${post.blogName}/post/${post.id}`
                : `/post/${post.id}`
            }
            variant="ghost"
            size="icon"
            class="size-9 text-muted-foreground"
            aria-label="Open permalink"
            onClick={handlePermalink}
          >
            <ExternalLink class="size-4" />
          </Button>
        </Show>
      </div>

      <div class="px-3">
        <ReblogAttribution
          originBlogName={post.originBlogName}
          originPostId={post.originPostId}
          variant={post.variant}
        />
      </div>

      <Show when={post.title?.trim()}>
        <h2 class="px-3 pb-2 text-lg font-semibold leading-snug">
          {post.title!.trim()}
        </h2>
      </Show>

      <Show when={contentHtml()}>
        <div
          class="post-content px-3 pb-3"
          innerHTML={contentHtml()!}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "IMG" && target.getAttribute("src")) {
              props.onImageClick?.(target.getAttribute("src")!, post.id);
            }
          }}
        />
      </Show>

      <Show when={post.type !== PostType.Text && mediaItems().length > 0}>
        <PostMediaList
          items={mediaItems()}
          onImageClick={(url) => props.onImageClick?.(url, post.id)}
        />
      </Show>

      <Show when={post.tags && post.tags.length > 0}>
        <div class="flex flex-wrap gap-1.5 px-3 py-3">
          <For each={post.tags}>
            {(tag) => (
              <Show
                when={props.onTagClick}
                fallback={
                  <Badge variant="secondary" class="font-normal">
                    #{tag}
                  </Badge>
                }
              >
                <Show
                  when={props.tagHref}
                  fallback={
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      class="h-7 text-xs"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </Button>
                  }
                >
                  <a
                    href={props.tagHref!(tag)}
                    class="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                    onClick={(event) => {
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey ||
                        event.button !== 0
                      ) {
                        return;
                      }
                      event.preventDefault();
                      handleTagClick(tag);
                    }}
                  >
                    #{tag}
                  </a>
                </Show>
              </Show>
            )}
          </For>
        </div>
      </Show>

      <div class="flex items-center gap-1 border-t border-border px-1 py-1">
        <Show
          when={user() && post.id}
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

        <Show
          when={post.id}
          fallback={
            <span class="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground">
              <MessageCircle class="size-4" /> {commentsCount()}
            </span>
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9 gap-1.5 px-2"
            onClick={handleCommentsOpen}
            title="View comments"
            aria-label={`View ${commentsCount()} comments`}
          >
            <MessageCircle class="size-4" />
            {commentsCount()}
          </Button>
        </Show>

        <Show
          when={user() && post.id}
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
      </div>

      <Show when={actionError()}>
        <div class="px-3 pb-3">
          <Alert variant="destructive">
            <AlertDescription>{actionError()}</AlertDescription>
          </Alert>
        </div>
      </Show>

      <Show when={showReblog()}>
        <ReblogComposer post={post} onClose={() => setShowReblog(false)} />
      </Show>

      <Show when={showComments()}>
        <Dialog open onOpenChange={(open) => !open && setShowComments(false)}>
          <DialogPortal>
            <DialogContent
              class={`${sheetDialogClass} max-h-[85dvh] overflow-y-auto`}
            >
              <DialogTitle class="sr-only">Comments</DialogTitle>
              <Comments
                postId={post.id}
                initialCount={post.commentsCount ?? 0}
                onCountChange={setCommentsCount}
              />
            </DialogContent>
          </DialogPortal>
        </Dialog>
      </Show>
    </Card>
  );
}
