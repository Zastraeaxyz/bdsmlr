import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { WarningIcon } from "~/components/Icons";
import { isPrivateBlogError } from "~/lib/blogErrors";
import { useAuth } from "~/lib/useAuth";

/**
 * Renders the usual `.error` paragraph, except when the feed failed because
 * the blog is private. In that case it shows an explanation and a sign-in
 * button instead of BDSMLR's raw "Cannot find any route matching" message.
 */
export function FeedErrorNotice(props: {
  message: string;
  blogName?: string;
}) {
  const { user } = useAuth();

  return (
    <Show
      when={isPrivateBlogError(props.message)}
      fallback={<p class="error">{props.message}</p>}
    >
      <div class="private-blog-notice" role="status">
        <WarningIcon />
        <div class="private-blog-notice-copy">
          <strong>This blog is private.</strong>
          <span>
            {user()
              ? "You are signed in, but this blog still is not visible to you. You may need to follow it on BDSMLR first."
              : `Sign in to your BDSMLR account to view${
                  props.blogName ? ` @${props.blogName}` : " this blog"
                }.`}
          </span>
        </div>
        <Show when={!user()}>
          <A href="/login" class="private-blog-notice-login">
            Sign in
          </A>
        </Show>
      </div>
    </Show>
  );
}
