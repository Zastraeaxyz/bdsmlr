import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { WarningIcon } from "~/components/Icons";
import { isPrivateBlogError } from "~/lib/blogErrors";
import { isRateLimitMessage } from "~/lib/requestError";
import { useAuth } from "~/lib/useAuth";

/**
 * Renders the usual `.error` paragraph, except for two cases that are not this
 * site's fault and should not read like one:
 *
 * - BDSMLR is rate limiting us, which clears up on its own in a minute or two.
 * - the blog is private, which looks like a routing error to BDSMLR.
 */
export function FeedErrorNotice(props: {
  message: string;
  blogName?: string;
  onRetry?: () => void;
}) {
  const { user } = useAuth();

  return (
    <Show
      when={isRateLimitMessage(props.message)}
      fallback={
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
      }
    >
      <div class="rate-limit-notice" role="status">
        <WarningIcon />
        <div class="rate-limit-notice-copy">
          <strong>BDSMLR is limiting requests.</strong>
          <span>
            This is not a problem with this site or with this blog. BDSMLR is
            refusing new requests for a minute or two, then everything loads
            again.
          </span>
        </div>
        <Show when={props.onRetry}>
          <button
            type="button"
            class="rate-limit-notice-retry"
            onClick={() => props.onRetry?.()}
          >
            Try again
          </button>
        </Show>
      </div>
    </Show>
  );
}
